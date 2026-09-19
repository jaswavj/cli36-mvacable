import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { inventoryApi, invData, invError } from '../../../api/inventory/inventory-api-service';
import '../master/Master.css';
import '../BillingPage.css';

type Named = { id: number; name: string };
type Supplier = Named & { isGst?: number };
type Product = {
  id: number;
  name: string;
  code?: string;
  cost: number;
  mrp: number;
  gst: number;
  convertionUnit?: string;
  convertionCalculation?: number;
};
type Line = {
  key: number;
  productId: number;
  name: string;
  qty: string;
  free: string;
  cost: string;
  mrp: string;
  disc: string;
  tax: string;
  convertionCalc: number;
};
type Hist = {
  supplierName: string;
  dateTime: string;
  invoiceNo: string;
  qty: number;
  free: number;
  cost: number;
  mrp: number;
  disc: number;
  tax: number;
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (v: string | number) => Number(v) || 0;
const money = (v: number) => (Number.isFinite(v) ? v.toFixed(3) : '0.000');

const calcLine = (line: Line) => {
  const tot = n(line.qty);
  const free = n(line.free);
  const qty = Math.max(0, tot - free);
  const cost = n(line.cost);
  const mrp = n(line.mrp);
  const disc = n(line.disc);
  const tax = n(line.tax);
  const costTotal = qty * cost;
  const discAmt = costTotal * (disc / 100);
  const taxAmt = (costTotal - discAmt) * (tax / 100);
  const netTotal = costTotal - discAmt + taxAmt;
  const mrpTotal = qty * mrp;
  const unit = tot > 0 ? netTotal / tot : 0;
  return { costTotal, taxAmt, netTotal, mrpTotal, unit };
};

const PurchasePage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [payTypes, setPayTypes] = useState<Named[]>([]);
  const [banks, setBanks] = useState<Named[]>([]);
  const [supplierId, setSupplierId] = useState('0');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [payType, setPayType] = useState('0');
  const [bankId, setBankId] = useState('0');
  const [paid, setPaid] = useState('0.000');
  const [extra, setExtra] = useState('0.000');
  const [lines, setLines] = useState<Line[]>([]);
  const [key, setKey] = useState(1);
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState<string[]>([]);
  const [history, setHistory] = useState<Hist[] | null>(null);
  const [historyName, setHistoryName] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<Product | null>(null);
  const [addQty, setAddQty] = useState('1');
  const [addCost, setAddCost] = useState('');
  const qtyRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inventoryApi.lookups().then((res) => {
      const data = invData<any>(res);
      setSuppliers(data.suppliers || []);
      setPayTypes((data.paymentTypes || []).filter((p: Named) => p.id !== 0));
      setBanks(data.banks || []);
    }).catch((err) => toast.error(invError(err, 'Could not load lookups')));
  }, []);

  useEffect(() => {
    if (search.trim().length < 1) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      inventoryApi.searchProducts(search.trim()).then((res) => setHits(invData<string[]>(res) || [])).catch(() => setHits([]));
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!pending) return;
    requestAnimationFrame(() => {
      qtyRef.current?.focus();
      qtyRef.current?.select();
    });
  }, [pending]);

  const openAdd = (product: Product) => {
    setPending(product);
    setAddQty('1');
    setAddCost(String(product.cost ?? 0));
    setSearch('');
    setHits([]);
  };

  const confirmAdd = () => {
    if (!pending) return;
    if (!(n(addQty) > 0)) {
      toast.warning('Enter quantity');
      return;
    }
    if (addCost.trim() === '' || !Number.isFinite(Number(addCost))) {
      toast.warning('Enter cost');
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        key,
        productId: pending.id,
        name: pending.name,
        qty: addQty,
        free: '0',
        cost: String(n(addCost)),
        mrp: String(pending.mrp ?? 0),
        disc: '0',
        tax: String(pending.gst ?? 0),
        convertionCalc: pending.convertionCalculation || 1,
      },
    ]);
    setKey((k) => k + 1);
    setPending(null);
    setAddQty('1');
    setAddCost('');
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const addByCode = async (code: string) => {
    const product = invData<Product | null>(await inventoryApi.productByCode(code));
    if (!product) return false;
    openAdd(product);
    return true;
  };

  const addByName = async (name: string) => {
    const product = invData<Product | null>(await inventoryApi.productByName(name));
    if (!product) return false;
    openAdd(product);
    return true;
  };

  const addProduct = async (name: string) => {
    try {
      if (await addByName(name)) return;
      toast.warning('Product not found');
    } catch (err) {
      toast.error(invError(err, 'Could not add product'));
    }
  };

  const onSearchKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== 'Tab') return;
    e.preventDefault();
    const val = search.trim();
    if (!val) return;
    try {
      const labeled = val.match(/^(.+?)\s+-\s+(.+)$/);
      if (labeled) {
        if (!(await addByCode(labeled[1].trim()))) toast.error(`Product not found: ${labeled[1].trim()}`);
        return;
      }
      if (await addByCode(val)) return;
      const name = hits[0] || val;
      if (await addByName(name)) return;
      if (name !== val && (await addByName(val))) return;
      toast.error(`Product not found: ${val}`);
    } catch (err) {
      toast.error(invError(err, 'Could not add product'));
    }
  };

  const patch = (k: number, field: keyof Line, value: string) => {
    setLines((prev) => prev.map((l) => (l.key === k ? { ...l, [field]: value } : l)));
  };

  const sums = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        const c = calcLine(line);
        acc.cost += c.costTotal;
        acc.mrp += c.mrpTotal;
        acc.tax += c.taxAmt;
        acc.net += c.netTotal;
        return acc;
      },
      { cost: 0, mrp: 0, tax: 0, net: 0 }
    );
  }, [lines]);

  const grand = Math.max(0, sums.net - n(extra));
  const balance = Math.max(0, grand - n(paid));

  const onSupplier = (id: string) => {
    setSupplierId(id);
    const sup = suppliers.find((s) => String(s.id) === id);
    if (sup?.isGst === 1) {
      const bank = banks.find((b) => b.id === 2) || banks[0];
      const upi = payTypes.find((p) => p.id === 2) || payTypes.find((p) => /bank|upi/i.test(p.name));
      if (upi) setPayType(String(upi.id));
      if (bank) setBankId(String(bank.id));
    }
  };

  const closeHistory = () => {
    setHistory(null);
    setHistoryName('');
  };

  const showHistory = async (name: string) => {
    try {
      setHistoryName(name);
      setHistory(invData<Hist[]>(await inventoryApi.productHistory(name)) || []);
    } catch (err) {
      toast.error(invError(err, 'Could not load history'));
    }
  };

  const canOpenSave = () => {
    const products = lines.filter((l) => n(l.qty) > 0 && l.name);
    if (products.length === 0) {
      toast.warning('Please add at least one product with quantity.');
      return false;
    }
    if (products.some((l) => n(l.mrp) <= 0)) {
      toast.warning('Please enter MRP for all products.');
      return false;
    }
    if (grand <= 0) {
      toast.warning('Grand total must be greater than zero.');
      return false;
    }
    return true;
  };

  const canSave = () => {
    if (!canOpenSave()) return false;
    if (supplierId === '0') {
      toast.warning('Please select supplier name.');
      return false;
    }
    if (!invoiceNo.trim()) {
      toast.warning('Please enter invoice number.');
      return false;
    }
    if (payType === '0') {
      toast.warning('Please select payment mode.');
      return false;
    }
    if (payType !== '1' && bankId === '0') {
      toast.warning('Please select payment mode (Bank details).');
      return false;
    }
    return true;
  };

  const openConfirm = () => {
    if (!canOpenSave()) return;
    setConfirmOpen(true);
  };

  const save = async () => {
    if (!canSave()) return;
    const products = lines.filter((l) => n(l.qty) > 0 && l.name);
    setBusy(true);
    try {
      const prno = invData<string>(
        await inventoryApi.savePurchase({
          supplierId: Number(supplierId),
          invoiceNo: invoiceNo.trim(),
          invoiceDate,
          payType: Number(payType),
          bankId: Number(bankId),
          grandTotal: grand,
          paidAmount: n(paid),
          extraDisc: n(extra),
          balanceAmount: balance,
          products: products.map((l) => ({
            productId: l.productId,
            name: l.name,
            qty: n(l.qty),
            freeQty: n(l.free),
            cost: n(l.cost),
            mrp: n(l.mrp),
            disc: n(l.disc),
            tax: n(l.tax),
            convertionCalc: l.convertionCalc,
          })),
        })
      );
      toast.success(`Purchase saved. Bill No: ${prno}`);
      setConfirmOpen(false);
      setLines([]);
      setInvoiceNo('');
      setPaid('0.000');
      setExtra('0.000');
    } catch (err) {
      toast.error(invError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pos-wrap">
      <div className="pos-top">
        <div className="pos-row" style={{ position: 'relative' }}>
          <div className="pos-fg" style={{ flex: 1 }}>
            <span className="pos-lbl">Add Item</span>
            <input
              ref={searchRef}
              className="pos-inp"
              placeholder="Code / Item Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onSearchKey}
            />
            {hits.length > 0 && (
              <div className="pos-suggest">
                {hits.map((h) => (
                  <button key={h} type="button" onClick={() => addProduct(h)}>{h}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {pending && (
        <div className="pos-modal-back" onClick={() => setPending(null)}>
          <div className="pos-modal pos-save-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Add Item</h4>
              <button className="pos-btn pos-btn-outline" type="button" onClick={() => setPending(null)}>Close</button>
            </div>
            <div className="mst-note" style={{ marginBottom: 12 }}>
              {pending.code ? `${pending.code} — ` : ''}{pending.name}
            </div>
            <div className="pos-row" style={{ marginBottom: 12 }}>
              <div className="pos-fg" style={{ minWidth: 120 }}>
                <span className="pos-lbl">Qty</span>
                <input
                  ref={qtyRef}
                  className="pos-inp pos-inp-lg"
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmAdd()}
                />
              </div>
              <div className="pos-fg" style={{ minWidth: 140 }}>
                <span className="pos-lbl">Cost</span>
                <input
                  className="pos-inp pos-inp-lg"
                  type="number"
                  min="0"
                  step="0.001"
                  value={addCost}
                  onChange={(e) => setAddCost(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmAdd()}
                />
              </div>
              <div className="pos-fg" style={{ minWidth: 140 }}>
                <span className="pos-lbl">MRP</span>
                <input className="pos-inp" readOnly value={money(n(pending.mrp))} />
              </div>
            </div>
            <div className="pos-acts">
              <button className="pos-btn" type="button" onClick={confirmAdd}>
                <i className="fas fa-plus" /> ADD
              </button>
              <button className="pos-btn pos-btn-outline" type="button" onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div className="mst-table-wrap" style={{ flex: 1, margin: '6px 10px', background: 'var(--color-bg-surface)', borderRadius: 7 }}>
        <table className="mst-table mst-table-wide">
          <thead>
            <tr>
              <th></th>
              <th>Item Name</th>
              <th className="num">Qty</th>
              <th className="num">Cost</th>
              <th className="num">MRP</th>
              <th className="num">Disc%</th>
              <th className="num">Tax%</th>
              <th className="num">Free</th>
              <th></th>
              <th className="num">Cost Tot</th>
              <th className="num">MRP Tot</th>
              <th className="num">Tax Tot</th>
              <th className="num">Net Tot</th>
              <th className="num">Unit Cost</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr><td colSpan={14} className="mst-empty">Search and add products</td></tr>
            )}
            {lines.map((line) => {
              const c = calcLine(line);
              return (
                <tr key={line.key}>
                  <td>
                    <button className="mst-icon-btn danger" type="button" onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}>
                      <i className="fas fa-trash" />
                    </button>
                  </td>
                  <td>{line.name}</td>
                  <td><input className="mst-inp" type="number" min="0" step="0.001" value={line.qty} onChange={(e) => patch(line.key, 'qty', e.target.value)} /></td>
                  <td><input className="mst-inp" type="number" step="0.001" value={line.cost} onChange={(e) => patch(line.key, 'cost', e.target.value)} /></td>
                  <td><input className="mst-inp" type="number" step="0.001" value={line.mrp} onChange={(e) => patch(line.key, 'mrp', e.target.value)} /></td>
                  <td><input className="mst-inp" type="number" step="0.01" value={line.disc} onChange={(e) => patch(line.key, 'disc', e.target.value)} /></td>
                  <td><input className="mst-inp" type="number" step="0.01" value={line.tax} onChange={(e) => patch(line.key, 'tax', e.target.value)} /></td>
                  <td><input className="mst-inp" type="number" min="0" step="0.001" value={line.free} onChange={(e) => patch(line.key, 'free', e.target.value)} /></td>
                  <td>
                    <button className="mst-icon-btn" type="button" title="History" onClick={() => showHistory(line.name)}>
                      <i className="fas fa-history" />
                    </button>
                  </td>
                  <td className="num">{money(c.costTotal)}</td>
                  <td className="num">{money(c.mrpTotal)}</td>
                  <td className="num">{money(c.taxAmt)}</td>
                  <td className="num">{money(c.netTotal)}</td>
                  <td className="num">{money(c.unit)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={9} style={{ textAlign: 'right' }}>Summary Total:</td>
              <td className="num">{money(sums.cost)}</td>
              <td className="num">{money(sums.mrp)}</td>
              <td className="num">{money(sums.tax)}</td>
              <td className="num">{money(sums.net)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="pos-top" style={{ borderTop: '2px solid color-mix(in srgb, var(--color-primary) 12%, transparent)' }}>
        <div className="pos-row">
          <button className="pos-btn" type="button" disabled={busy} onClick={openConfirm}>
            <i className="fas fa-save" /> SAVE
          </button>
        </div>
      </div>
      {confirmOpen && (
        <div className="pos-modal-back" onClick={() => !busy && setConfirmOpen(false)}>
          <div className="pos-modal pos-save-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Confirm Purchase</h4>
              <button className="pos-btn pos-btn-outline" type="button" disabled={busy} onClick={() => setConfirmOpen(false)}>
                Close
              </button>
            </div>
            <div className="pos-row" style={{ marginBottom: 12 }}>
              <div className="pos-fg" style={{ flex: 2, minWidth: 180 }}>
                <span className="pos-lbl">Supplier</span>
                <select className="pos-sel" value={supplierId} onChange={(e) => onSupplier(e.target.value)}>
                  <option value="0">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="pos-fg" style={{ flex: 1.5, minWidth: 140 }}>
                <span className="pos-lbl">Invoice No.</span>
                <input className="pos-inp" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
              </div>
              <div className="pos-fg" style={{ minWidth: 150 }}>
                <span className="pos-lbl">Invoice Date</span>
                <input className="pos-inp" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
              </div>
            </div>
            <div className="pos-grid">
              <div className="pos-fg">
                <span className="pos-lbl">Payment Type</span>
                <select className="pos-sel" value={payType} onChange={(e) => setPayType(e.target.value)}>
                  <option value="0">Select Payment Type</option>
                  {payTypes.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="pos-fg">
                <span className="pos-lbl">Bank / Mode</span>
                <select className="pos-sel" value={bankId} onChange={(e) => setBankId(e.target.value)} disabled={payType === '1'}>
                  <option value="0">Select Mode</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="pos-fg">
                <span className="pos-lbl">Total Amount</span>
                <input className="pos-inp" readOnly value={money(grand)} />
              </div>
              <div className="pos-fg">
                <span className="pos-lbl">Paid Now</span>
                <input className="pos-inp" type="number" step="0.001" value={paid} onChange={(e) => setPaid(e.target.value)} />
              </div>
              <div className="pos-fg">
                <span className="pos-lbl">Extra Discount</span>
                <input className="pos-inp" type="number" step="0.001" value={extra} onChange={(e) => setExtra(e.target.value)} />
              </div>
              <div className="pos-fg">
                <span className="pos-lbl">Balance</span>
                <input className="pos-inp" readOnly value={money(balance)} />
              </div>
            </div>
            <div className="pos-acts" style={{ marginTop: 14 }}>
              <button className="pos-btn" type="button" disabled={busy} onClick={save}>
                <i className="fas fa-save" /> {busy ? 'SAVING...' : 'SAVE'}
              </button>
              <button className="pos-btn pos-btn-outline" type="button" disabled={busy} onClick={() => setConfirmOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {history && (
        <div className="pos-modal-back" onClick={closeHistory}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Last 6 Purchase History{historyName ? ` — ${historyName}` : ''}</h4>
              <button className="pos-btn pos-btn-outline" type="button" onClick={closeHistory}>Close</button>
            </div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Date</th>
                    <th>Invoice</th>
                    <th className="num">Qty</th>
                    <th className="num">Free</th>
                    <th className="num">Cost</th>
                    <th className="num">MRP</th>
                    <th className="num">Disc%</th>
                    <th className="num">Tax%</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 && <tr><td colSpan={9} className="mst-empty">No purchase history</td></tr>}
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td>{h.supplierName}</td>
                      <td>{h.dateTime}</td>
                      <td>{h.invoiceNo}</td>
                      <td className="num">{h.qty}</td>
                      <td className="num">{h.free}</td>
                      <td className="num">{h.cost}</td>
                      <td className="num">{h.mrp}</td>
                      <td className="num">{h.disc}</td>
                      <td className="num">{h.tax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasePage;
