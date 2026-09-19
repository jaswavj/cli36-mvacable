import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { BillingApiService } from '../../api/billing/billing-api-service';
import { OrderListApiService } from '../../api/orders/order-list-api-service';
import { RootState } from '../../state/store';
import { A4Invoice } from './A4Invoice';
import { printOnClientPrinter } from '../../utils/local-pos-print';
import './BillingPage.css';

type Product = {
  id: number;
  code: string;
  name: string;
  mrp: number;
  batchId: number;
  unitName: string;
  convertionUnit: string;
  commission: number;
  stock: number;
};

type Line = {
  key: number;
  productId: number;
  code: string;
  name: string;
  qty: number;
  displayQty: number;
  displayUnit: string;
  price: number;
  discType: 1 | 2;
  discInput: number;
  discount: number;
  commissionPer: number;
  commission: number;
  total: number;
  batchId: number;
};

type Customer = {
  id: number;
  name: string;
  phone: string;
  isEligibleForCommission: number;
  exchangePoint: number;
};

const api = new BillingApiService();
const ordersApi = new OrderListApiService();
const money = (n: number) => (Number.isFinite(n) ? n.toFixed(3) : '0.000');

const BillingPage: React.FC = () => {
  const login = useSelector((s: RootState) => s.loginData);
  const [discPer, setDiscPer] = useState(login.discPer || 100);
  const [canBillWithoutStock, setCanBillWithoutStock] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState(0);
  const [customerHits, setCustomerHits] = useState<Customer[]>([]);
  const [exchangePoint, setExchangePoint] = useState(0);
  const [exchangeUsed, setExchangeUsed] = useState(0);
  const [bypassCap, setBypassCap] = useState(false);
  const [isTaxBill, setIsTaxBill] = useState(true);
  const [isCommission, setIsCommission] = useState(false);

  const [search, setSearch] = useState('');
  const [nameHits, setNameHits] = useState<string[]>([]);
  const [pending, setPending] = useState<Product | null>(null);
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [unitSel, setUnitSel] = useState('');
  const [stock, setStock] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  const [lines, setLines] = useState<Line[]>([]);
  const [lineKey, setLineKey] = useState(1);
  const [extraDisc, setExtraDisc] = useState('0');
  const [mode, setMode] = useState('1');
  const [payType, setPayType] = useState('1');
  const [cashPaid, setCashPaid] = useState('0');
  const [bankPaid, setBankPaid] = useState('0');
  const [balance, setBalance] = useState('0');
  const [saving, setSaving] = useState(false);
  const [savedNo, setSavedNo] = useState('');
  const [quotationId, setQuotationId] = useState(0);
  const [holdNo, setHoldNo] = useState('');

  const [saveOpen, setSaveOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderId, setOrderId] = useState(0);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holds, setHolds] = useState<any[]>([]);
  const [dupeOpen, setDupeOpen] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const [dupeNo, setDupeNo] = useState('');
  const [history, setHistory] = useState<any[] | null>(null);
  const [historyName, setHistoryName] = useState('');
  const [a4Bill, setA4Bill] = useState<any>(null);

  useEffect(() => {
    api.options().then((res: any) => {
      if (res?.success && res.data) {
        setDiscPer(res.data.discPer ?? 100);
        setCanBillWithoutStock(!!res.data.canBillWithoutStock);
      }
    }).catch(() => undefined);
  }, []);

  const totals = useMemo(() => {
    const priceTotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
    const discountTotal = lines.reduce((s, l) => s + l.discount, 0);
    const commissionTotal = isCommission ? lines.reduce((s, l) => s + l.commission, 0) : 0;
    const grandTotal = lines.reduce((s, l) => s + (isCommission ? l.total : l.qty * l.price - l.discount), 0);
    return { priceTotal, discountTotal, commissionTotal, grandTotal };
  }, [lines, isCommission]);

  const extra = parseFloat(extraDisc) || 0;
  const payable = Math.max(0, totals.grandTotal - extra);

  useEffect(() => {
    if (!bypassCap && totals.priceTotal > 0 && discPer < 100) {
      const maxAllowed = (totals.priceTotal * discPer) / 100;
      if (totals.discountTotal + extra > maxAllowed) {
        const maxExtra = Math.max(0, Math.floor(maxAllowed - totals.discountTotal));
        setExtraDisc(String(maxExtra));
        toast.warn(`Max extra discount is ${discPer}% of price total.`);
      }
    }
  }, [extraDisc, totals, discPer, bypassCap]);

  useEffect(() => {
    if (mode === '1') {
      setCashPaid(money(payable));
      setBankPaid('0');
      setBalance('0');
    } else if (mode === '2') {
      setCashPaid('0');
      setBankPaid(money(payable));
      setBalance('0');
    }
  }, [payable, mode]);

  const searchCustomers = async (query?: string, phone?: string) => {
    if ((!query || query.length < 1) && (!phone || phone.length < 2)) {
      setCustomerHits([]);
      return;
    }
    const res: any = await api.searchCustomers(query, phone);
    setCustomerHits(res?.data || []);
  };

  const pickCustomer = (c: Customer) => {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone === '-' ? '' : c.phone);
    setExchangePoint(c.exchangePoint || 0);
    if (c.isEligibleForCommission === 1) setIsCommission(true);
    setCustomerHits([]);
  };

  const focusQty = () => {
    requestAnimationFrame(() => {
      qtyRef.current?.focus();
      qtyRef.current?.select();
    });
  };

  const matchesPending = (val: string, p: Product | null) => {
    if (!p) return false;
    const v = val.trim().toLowerCase();
    return v === String(p.code).toLowerCase()
      || v === String(p.name).toLowerCase()
      || v === `${p.code} - ${p.name}`.toLowerCase();
  };

  const applyProduct = (p: Product) => {
    setPending(p);
    setSearch(`${p.code} - ${p.name}`);
    setPrice(String(p.mrp ?? 0));
    setStock(p.stock ?? 0);
    const unit = (p.unitName || '').toLowerCase();
    if (unit === 'kg' || unit === 'kgs') {
      setUnitSel('kg');
    } else {
      setUnitSel('');
    }
    setNameHits([]);
    focusQty();
  };

  const lookupByCode = async (code: string) => {
    const res: any = await api.productByCode(code);
    if (res?.data) {
      applyProduct(res.data);
      return true;
    }
    return false;
  };

  const lookupByName = async (name: string) => {
    const res: any = await api.productByName(name);
    if (res?.data) {
      applyProduct(res.data);
      return true;
    }
    return false;
  };

  const onSearchChange = async (value: string) => {
    setSearch(value);
    if (value.trim().length < 1) {
      setNameHits([]);
      return;
    }
    const res: any = await api.searchProducts(value.trim());
    setNameHits(res?.data || []);
  };

  const onSearchKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' && e.key !== 'Tab') return;
    e.preventDefault();
    const val = search.trim();
    if (!val) return;
    if (matchesPending(val, pending)) {
      focusQty();
      return;
    }
    const labeled = val.match(/^(.+?)\s+-\s+(.+)$/);
    if (labeled) {
      if (!(await lookupByCode(labeled[1].trim()))) toast.error(`Product not found: ${labeled[1].trim()}`);
      return;
    }
    if (await lookupByCode(val)) return;
    const name = nameHits[0] || val;
    if (await lookupByName(name)) return;
    if (name !== val && (await lookupByName(val))) return;
    toast.error(`Product not found: ${val}`);
  };

  const addedQty = (productId: number) =>
    lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.qty, 0);

  const addProduct = () => {
    if (!pending) {
      toast.error('Select a product first');
      return;
    }
    const qtyInput = parseFloat(qty);
    const unitPrice = parseFloat(price);
    if (!qtyInput || !Number.isFinite(unitPrice)) {
      toast.error('Enter quantity and price');
      return;
    }
    const unitName = (pending.unitName || '').toLowerCase();
    let actualQty = qtyInput;
    let displayUnit = pending.convertionUnit || pending.unitName;
    if ((unitName === 'kg' || unitName === 'kgs') && unitSel === 'gram') {
      actualQty = qtyInput / 1000;
      displayUnit = 'Gram';
    } else if (unitName === 'kg' || unitName === 'kgs') {
      displayUnit = 'KG';
    }
    const already = addedQty(pending.id);
    const available = (stock ?? 0) - already;
    if (!canBillWithoutStock && actualQty > available) {
      toast.warn(`Stock limit. Available to add: ${available}`);
      return;
    }
    const commission = isCommission ? pending.commission * actualQty : 0;
    const total = actualQty * unitPrice - commission;
    setLines((prev) => [
      ...prev,
      {
        key: lineKey,
        productId: pending.id,
        code: pending.code,
        name: pending.name,
        qty: actualQty,
        displayQty: qtyInput,
        displayUnit,
        price: unitPrice,
        discType: 1,
        discInput: 0,
        discount: 0,
        commissionPer: pending.commission,
        commission,
        total,
        batchId: pending.batchId,
      },
    ]);
    setLineKey((k) => k + 1);
    setPending(null);
    setSearch('');
    setQty('1');
    setPrice('');
    setUnitSel('');
    setStock(null);
    setNameHits([]);
    searchRef.current?.focus();
  };

  const updateLineDisc = (key: number, discType: 1 | 2, discInput: number) => {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const subtotal = line.qty * line.price;
        let input = discInput;
        if (discType === 2) input = Math.min(100, input);
        else input = Math.min(subtotal, input);
        const discount = discType === 2 ? (subtotal * input) / 100 : input;
        const commission = isCommission ? line.commissionPer * line.qty : 0;
        return { ...line, discType, discInput: input, discount, commission, total: subtotal - discount - commission };
      })
    );
  };

  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));

  const collectProducts = () =>
    lines.map((l) => ({
      id: l.productId,
      qty: l.qty,
      price: l.price,
      discount: l.discount,
      total: isCommission ? l.total : l.qty * l.price - l.discount,
      batchId: l.batchId,
      commission: isCommission ? l.commissionPer : 0,
    }));

  const payloadBase = () => ({
    customerName: customerName || '-',
    customerPhn: customerPhone || '-',
    customerId,
    shopId: login.shopId || sessionStorage.getItem('shopId') || '',
    isEligibleForCommission: isCommission ? 1 : 0,
    priceCategory: 3,
    isTaxBill: isTaxBill ? 1 : 0,
    finalDiscount: extra,
    payableAmount: payable,
    grandTotal: totals.grandTotal,
    priceTotal: totals.priceTotal,
    discountTotal: totals.discountTotal,
    products: collectProducts(),
  });

  const openSave = () => {
    if (totals.priceTotal === 0 && !savedNo) {
      toast.error('Empty bill. Add products first.');
      return;
    }
    setSaveOpen(true);
  };

  const saveBill = async () => {
    if (savedNo) return;
    if (totals.priceTotal === 0) {
      toast.error('Empty bill. Add products first.');
      return;
    }
    const cash = parseFloat(cashPaid) || 0;
    const bank = parseFloat(bankPaid) || 0;
    const bal = parseFloat(balance) || 0;
    if (cash + bank > payable + 0.001) {
      toast.error('Paid amount exceeds payable amount.');
      return;
    }
    if ((customerName === '' || customerName === '-') && bal > 0) {
      toast.error('Enter customer name for balance payment.');
      return;
    }
    if (Math.abs(cash + bank + bal - payable) > 0.02) {
      toast.error('Paid and payable amount mismatch.');
      return;
    }
    setSaving(true);
    try {
      const res: any = await api.saveBill({
        ...payloadBase(),
        cashPaid: cash,
        bankPaid: bank,
        mode: Number(mode),
        type: Number(payType),
        balance: bal,
        quotationId,
        exchangePointUsed: exchangeUsed,
      });
      if (res?.success) {
        setSavedNo(res.data.billDisplay);
        toast.success(`Bill saved: ${res.data.billDisplay}`);
      } else {
        toast.error(res?.data?.error || 'Save failed');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveHold = async () => {
    if (totals.priceTotal === 0) {
      toast.error('Add products before hold.');
      return;
    }
    try {
      const res: any = await api.saveHold(payloadBase());
      if (res?.success) {
        setHoldNo(res.data.quotNo);
        toast.success(`Held as ${res.data.quotNo}`);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.data?.error || 'Hold failed');
    }
  };

  const openHolds = async () => {
    const res: any = await api.holds();
    setHolds(res?.data || []);
    setHoldOpen(true);
  };

  const loadHold = async (id: number) => {
    const res: any = await api.holdDetails(id);
    const items: any[] = res?.data || [];
    setLines(
      items.map((item, idx) => ({
        key: idx + 1,
        productId: item.productId,
        code: item.code,
        name: item.name,
        qty: item.qty,
        displayQty: item.qty,
        displayUnit: item.unitName || '',
        price: item.price,
        discType: 1,
        discInput: item.discount,
        discount: item.discount,
        commissionPer: item.commission || 0,
        commission: (item.commission || 0) * item.qty,
        total: item.total,
        batchId: item.batchId,
      }))
    );
    setLineKey(items.length + 1);
    setQuotationId(id);
    setHoldOpen(false);
    toast.info('Hold loaded into bill');
  };

  const openDupe = async () => {
    const res: any = await api.recentBills();
    setRecent(res?.data || []);
    setDupeOpen(true);
  };

  const openOrders = async () => {
    try {
      const [pending, delivered] = await Promise.all([
        ordersApi.list('pending'),
        ordersApi.list('delivered'),
      ]);
      setOrders([
        ...(((pending as any)?.data) || []),
        ...(((delivered as any)?.data) || []),
      ]);
      setOrderOpen(true);
    } catch {
      toast.error('Could not load orders');
    }
  };

  const loadOrder = async (id: number) => {
    try {
      const res: any = await ordersApi.detail(id);
      const items: any[] = res?.data?.items || [];
      if (!items.length) {
        toast.error('This order has no items');
        return;
      }
      const next: Line[] = [];
      for (let idx = 0; idx < items.length; idx += 1) {
        const item = items[idx];
        let batchId = 0;
        try {
          const prod: any = await api.productByCode(item.code);
          batchId = prod?.data?.batchId || 0;
        } catch {
          batchId = 0;
        }
        next.push({
          key: idx + 1,
          productId: item.prodId,
          code: item.code,
          name: item.productName,
          qty: item.qty,
          displayQty: item.qty,
          displayUnit: '',
          price: item.price,
          discType: 1,
          discInput: 0,
          discount: 0,
          commissionPer: 0,
          commission: 0,
          total: item.total,
          batchId,
        });
      }
      setLines(next);
      setLineKey(items.length + 1);
      setOrderId(id);
      setOrderOpen(false);
      toast.info(`Order ${res?.data?.orderNo || id} loaded`);
    } catch {
      toast.error('Could not load order');
    }
  };

  const printA4SameTab = async (billNo: string) => {
    try {
      const res: any = await api.printBill(billNo);
      if (!res?.success || !res.data) {
        toast.error('Could not load A4 invoice');
        return;
      }
      setA4Bill(res.data);
    } catch {
      toast.error('Could not load A4 invoice');
    }
  };

  const printBill = async (billNo = savedNo || dupeNo) => {
    if (!billNo) {
      toast.error('Save the bill first');
      return;
    }
    try {
      const res: any = await api.dispatchPrint(billNo);
      const data = res?.data || {};
      if (!res?.success) {
        toast.error(data.error || 'Thermal print failed. Check printer name in Company Details.');
        return;
      }
      if (data.type === 'a4') {
        await printA4SameTab(data.billNo || billNo);
        return;
      }
      if (data.type === 'thermal' || data.type === 'printed' || data.type === 'txt') {
        const local = await printOnClientPrinter({
          printerName: data.printerName,
          rawBase64: data.rawBase64,
        });
        if (local.ok) {
          toast.success(local.message || 'Receipt printed and cut');
          return;
        }
        const pos: any = await api.posPrint(billNo);
        const posData = pos?.data || {};
        if (pos?.success && (posData.type === 'printed' || posData.type === 'txt')) {
          toast.success(posData.message || 'ESC/POS printed');
          return;
        }
        toast.error(posData.error || 'ESC/POS print failed. Check printer name in Company Details.');
        return;
      }
      toast.error('Thermal print did not run. Check printer name in Company Details.');
    } catch (e: any) {
      toast.error(e?.response?.data?.data?.error || e?.message || 'Thermal print failed');
    }
  };

  const showHistory = async (line: Line) => {
    const res: any = await api.productHistory(line.productId, customerId || undefined);
    setHistoryName(line.name);
    setHistory(res?.data || []);
  };

  const newBill = () => window.location.reload();

  const closeSave = () => {
    setSaveOpen(false);
    if (savedNo) newBill();
  };

  const kgProduct = pending && ['kg', 'kgs'].includes((pending.unitName || '').toLowerCase());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        openSave();
        return;
      }
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.code === 'KeyO' ? 'o'
        : e.code === 'KeyR' ? 'r'
        : e.code === 'KeyS' ? 's'
        : e.code === 'KeyB' ? 'b'
        : e.code === 'KeyP' ? 'p'
        : e.code === 'KeyC' ? 'c'
        : e.key.toLowerCase();
      if (k === 'o') { e.preventDefault(); saveHold(); }
      else if (k === 'r') { e.preventDefault(); newBill(); }
      else if (k === 's') { e.preventDefault(); openSave(); }
      else if (k === 'b') { e.preventDefault(); saveBill(); }
      else if (k === 'p') { e.preventDefault(); printBill(); }
      else if (k === 'c') { e.preventDefault(); closeSave(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!a4Bill) return;
    document.body.classList.add('a4-print-open');
    const close = () => setA4Bill(null);
    window.addEventListener('afterprint', close);
    const t = window.setTimeout(() => window.print(), 300);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', close);
      document.body.classList.remove('a4-print-open');
    };
  }, [a4Bill]);

  return (
    <div className="pos-wrap">
      <div className="pos-top">
        <div className="pos-row">
          <div className="pos-fg" style={{ flex: 2.8, minWidth: 160 }}>
            <span className="pos-lbl">Code / Item Name</span>
            <input
              ref={searchRef}
              className="pos-inp pos-inp-lg"
              value={search}
              placeholder="Scan barcode or search item"
              autoFocus
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={onSearchKey}
            />
            {stock !== null && (
              <span className="pos-stock" style={{
                background: stock <= 0 ? '#fee2e2' : stock <= 5 ? '#fef3c7' : '#dcfce7',
                color: stock <= 0 ? '#dc2626' : stock <= 5 ? '#b45309' : '#16a34a',
              }}>
                {stock <= 0 ? 'Stock: OUT OF STOCK' : `Stock: ${stock}`}
              </span>
            )}
            {nameHits.length > 0 && (
              <div className="pos-suggest">
                {nameHits.map((name) => (
                  <button key={name} type="button" onClick={() => lookupByName(name)}>{name}</button>
                ))}
              </div>
            )}
          </div>
          <div className="pos-fg" style={{ flex: 0.75, minWidth: 78 }}>
            <span className="pos-lbl">Unit</span>
            <select className="pos-sel" value={unitSel} disabled={!kgProduct} onChange={(e) => setUnitSel(e.target.value)}>
              <option value="">{pending?.unitName || 'Unit'}</option>
              {kgProduct && <option value="kg">KG</option>}
              {kgProduct && <option value="gram">Gram</option>}
            </select>
          </div>
          <div className="pos-fg" style={{ flex: 0.65, minWidth: 68 }}>
            <span className="pos-lbl">Qty</span>
            <input ref={qtyRef} className="pos-inp" value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProduct()} />
          </div>
          <div className="pos-fg" style={{ flex: 0.9, minWidth: 88 }}>
            <span className="pos-lbl">Price</span>
            <input className="pos-inp" value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addProduct()} />
          </div>
          <button className="pos-btn" type="button" onClick={addProduct}>ADD</button>
          <button className="pos-btn pos-btn-outline" type="button" onClick={openHolds}>HOLD LIST</button>
        </div>
      </div>

      <div className="pos-table-wrap">
        <table className="pos-table">
          <thead>
            <tr>
              <th>#</th><th>Code</th><th>Item Name</th><th>Qty</th><th>Price</th>
              <th>Discount</th><th>Commission</th><th>Total</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr key={line.key} onClick={() => showHistory(line)} style={{ cursor: 'pointer' }}>
                <td>{idx + 1}</td>
                <td>{line.code}</td>
                <td>{line.name}</td>
                <td>{line.displayQty} {line.displayUnit}</td>
                <td>₹{money(line.price)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="pos-disc-cell">
                    <select value={line.discType} onChange={(e) => updateLineDisc(line.key, Number(e.target.value) as 1 | 2, line.discInput)}>
                      <option value={1}>₹</option>
                      <option value={2}>%</option>
                    </select>
                    <input
                      className="pos-inp"
                      value={line.discInput}
                      onChange={(e) => updateLineDisc(line.key, line.discType, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </td>
                <td>₹{money(isCommission ? line.commission : 0)}</td>
                <td>₹{money(isCommission ? line.total : line.qty * line.price - line.discount)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <button className="pos-btn pos-btn-outline" type="button" onClick={() => removeLine(line.key)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pos-bottom">
        <div className="pos-footer">
          <div className="pos-total-box">
            <span>Total</span>
            <strong>₹{money(payable)}</strong>
          </div>
          <div className="pos-acts">
            <button className="pos-btn pos-btn-outline" type="button" onClick={() => setKeysOpen(true)}>
              <i className="fas fa-keyboard" /> KEYS
            </button>
            <button className="pos-btn pos-btn-outline" type="button" onClick={openDupe}>DUP</button>
            <button className="pos-btn pos-btn-outline" type="button" title="Alt+R" onClick={newBill}>REFRESH</button>
            <button className={`pos-btn ${savedNo ? 'pos-btn-saved' : 'pos-btn-navy'}`} type="button" title="Alt+S" onClick={openSave}>
              {savedNo ? 'BILL SAVED' : 'SAVE'}
            </button>
            {savedNo && <div className="pos-billno">Bill No - {savedNo}</div>}
            {holdNo && <div className="pos-billno">Hold - {holdNo}</div>}
            {orderId > 0 && <div className="pos-billno">Order loaded</div>}
          </div>
        </div>
      </div>

      {keysOpen && (
        <div className="pos-modal-back" onClick={() => setKeysOpen(false)}>
          <div className="pos-modal" style={{ width: 'min(420px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Shortcut keys</h4>
              <button className="pos-btn pos-btn-outline" type="button" onClick={() => setKeysOpen(false)}>Close</button>
            </div>
            <table className="pos-table">
              <tbody>
                <tr><td>Hold bill</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">O</kbd></td></tr>
                <tr><td>Refresh / new bill</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">R</kbd></td></tr>
                <tr><td>Open save modal</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">S</kbd></td></tr>
                <tr><td>Save bill</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">B</kbd></td></tr>
                <tr><td>Print</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">P</kbd></td></tr>
                <tr><td>Close save modal</td><td><kbd className="pos-kbd">Alt</kbd> + <kbd className="pos-kbd">C</kbd></td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
              After a bill is saved, Close / Alt+C refreshes the page for the next bill.
            </div>
          </div>
        </div>
      )}

      {saveOpen && (
        <div className="pos-modal-back" onClick={closeSave}>
          <div className="pos-modal pos-save-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Save Bill</h4>
              <button className="pos-btn pos-btn-outline" type="button" title="Alt+C" onClick={closeSave}>Close</button>
            </div>
            <div className="pos-row" style={{ marginBottom: 12 }}>
              <div className="pos-fg" style={{ flex: 1.6, minWidth: 130 }}>
                <span className="pos-lbl">Customer Name</span>
                <input
                  className="pos-inp pos-inp-lg"
                  value={customerName}
                  placeholder="Customer name"
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setCustomerId(0);
                    searchCustomers(e.target.value);
                  }}
                />
                {customerHits.length > 0 && (
                  <div className="pos-suggest">
                    {customerHits.map((c) => (
                      <button key={c.id} type="button" onClick={() => pickCustomer(c)}>
                        {c.name} {c.phone && c.phone !== '-' ? `· ${c.phone}` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="pos-fg" style={{ flex: 1, minWidth: 120 }}>
                <span className="pos-lbl">Phone No</span>
                <input
                  className="pos-inp pos-inp-lg"
                  value={customerPhone}
                  placeholder="Phone number"
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    searchCustomers(undefined, e.target.value);
                  }}
                />
              </div>
              <label className="pos-tog">
                <input type="checkbox" checked={isTaxBill} onChange={(e) => setIsTaxBill(e.target.checked)} />
                Tax Bill
              </label>
              <label className="pos-tog">
                <input type="checkbox" checked={isCommission} onChange={(e) => setIsCommission(e.target.checked)} />
                Commission
              </label>
            </div>
            {exchangePoint > 0 && (
              <div className="pos-banner" style={{ marginBottom: 12 }}>
                Exchange Points: ₹{exchangePoint}
                <button
                  className="pos-btn"
                  type="button"
                  onClick={() => {
                    const use = Math.min(exchangePoint, payable);
                    setExtraDisc(String(use));
                    setExchangeUsed(use);
                    setBypassCap(true);
                  }}
                >
                  Use as Discount
                </button>
              </div>
            )}
            <div className="pos-grid">
              <div className="pos-fg"><span className="pos-lbl">Price Total</span><input className="pos-inp" readOnly value={money(totals.priceTotal)} /></div>
              <div className="pos-fg"><span className="pos-lbl">Discount</span><input className="pos-inp" readOnly value={money(totals.discountTotal)} /></div>
              <div className="pos-fg"><span className="pos-lbl">Commission</span><input className="pos-inp" readOnly value={money(totals.commissionTotal)} /></div>
              <div className="pos-fg"><span className="pos-lbl">Grand Total</span><input className="pos-inp" readOnly value={money(totals.grandTotal)} /></div>
              <div className="pos-fg"><span className="pos-lbl">Extra Disc</span><input className="pos-inp" value={extraDisc} onChange={(e) => { setExtraDisc(e.target.value); setBypassCap(false); }} /></div>
              <div className="pos-fg"><span className="pos-lbl pos-payable">PAYABLE</span><input className="pos-inp pos-inp-payable" readOnly value={money(payable)} /></div>
            </div>
            <div className="pos-pay" style={{ marginTop: 10 }}>
              <div className="pos-fg">
                <span className="pos-lbl">Pay Mode</span>
                <select className="pos-sel" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="1">Cash</option>
                  <option value="2">Bank</option>
                  <option value="3">Mixed</option>
                </select>
              </div>
              <div className="pos-fg">
                <span className="pos-lbl">Pay Type</span>
                <select className="pos-sel" value={payType} disabled={mode === '1'} onChange={(e) => setPayType(e.target.value)}>
                  <option value="1">UPI</option>
                  <option value="2">Debit Card</option>
                  <option value="3">Credit Card</option>
                  <option value="4">Net Banking</option>
                  <option value="5">Wallet</option>
                </select>
              </div>
              <div className="pos-fg"><span className="pos-lbl">Cash Paid</span><input className="pos-inp" value={cashPaid} disabled={mode === '2'} onChange={(e) => setCashPaid(e.target.value)} /></div>
              <div className="pos-fg"><span className="pos-lbl">Bank Paid</span><input className="pos-inp" value={bankPaid} disabled={mode === '1'} onChange={(e) => setBankPaid(e.target.value)} /></div>
              <div className="pos-fg"><span className="pos-lbl">Balance</span><input className="pos-inp" value={balance} disabled={mode !== '3'} onChange={(e) => setBalance(e.target.value)} /></div>
            </div>
            <div className="pos-acts pos-acts-end" style={{ marginTop: 14 }}>
              <button className="pos-btn pos-btn-outline" type="button" title="Alt+C" onClick={closeSave}>CLOSE</button>
              <button className="pos-btn pos-btn-outline" type="button" title="Alt+O" onClick={saveHold}>HOLD</button>
              <button className="pos-btn pos-btn-outline" type="button" title="Alt+P" onClick={() => printBill()}>PRINT</button>
              <button className={`pos-btn ${savedNo ? 'pos-btn-saved' : 'pos-btn-navy'}`} disabled={saving || !!savedNo} title="Alt+B" onClick={saveBill}>
                {savedNo ? 'BILL SAVED' : saving ? 'Saving...' : 'SAVE'}
              </button>
              {savedNo && <div className="pos-billno">Bill No - {savedNo}</div>}
              {holdNo && <div className="pos-billno">Hold - {holdNo}</div>}
            </div>
          </div>
        </div>
      )}

      {orderOpen && (
        <div className="pos-modal-back" onClick={() => setOrderOpen(false)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Pending Orders</h4>
              <button className="pos-btn pos-btn-outline" type="button" onClick={() => setOrderOpen(false)}>Close</button>
            </div>
            <table className="pos-table">
              <thead><tr><th>Order No</th><th>Table</th><th>Date</th><th>Time</th><th></th></tr></thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={5}>No pending orders.</td></tr>
                )}
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNo}</td>
                    <td>{o.tableName}</td>
                    <td>{o.date}</td>
                    <td>{o.time}</td>
                    <td>
                      <button className="pos-btn" type="button" onClick={() => loadOrder(o.id)}>Bill This</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {holdOpen && (
        <div className="pos-modal-back" onClick={() => setHoldOpen(false)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Hold List</h4>
            <table className="pos-table">
              <thead><tr><th>No</th><th>Customer</th><th>Phone</th><th>Payable</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {holds.map((h) => (
                  <tr key={h.id}>
                    <td>{h.billDisplay}</td><td>{h.customerName}</td><td>{h.customerPhone}</td>
                    <td>{h.payable}</td><td>{h.date} {h.time}</td>
                    <td>
                      <button className="pos-btn" type="button" onClick={() => loadHold(h.id)}>Bill</button>
                      <button className="pos-btn pos-btn-outline" type="button" onClick={() => api.cancelHold(h.id).then(openHolds)}>Cancel</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dupeOpen && (
        <div className="pos-modal-back" onClick={() => setDupeOpen(false)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Duplicate Bill</h4>
            <button className="pos-btn" type="button" onClick={() => printBill(dupeNo)}>Print selected</button>
            <table className="pos-table">
              <thead><tr><th>Bill No</th><th>Name</th><th>Total</th><th>Paid</th><th>Date</th></tr></thead>
              <tbody>
                {recent.map((b) => (
                  <tr key={b.id} onClick={() => setDupeNo(b.billDisplay)} style={{ background: dupeNo === b.billDisplay ? '#e8f0fe' : undefined }}>
                    <td>{b.billDisplay}</td><td>{b.customerName}</td><td>{b.total}</td><td>{b.paid}</td><td>{b.date} {b.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {history && (
        <div className="pos-modal-back" onClick={() => setHistory(null)}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Last 6 Bills — {historyName}</h4>
            <table className="pos-table">
              <thead><tr><th>Bill No</th><th>Date</th><th>Customer</th><th>Qty</th><th>Price</th><th>Disc</th><th>Total</th></tr></thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td>{h.billNo}</td><td>{h.date} {h.time}</td><td>{h.customerName}</td>
                    <td>{h.qty}</td><td>{h.price}</td><td>{h.discount}</td><td>{h.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {a4Bill && createPortal(
        <div className="a4-print-host">
          <div className="a4-print-bar no-print">
            <button className="go" type="button" onClick={() => window.print()}>Print</button>
            <button className="stop" type="button" onClick={() => setA4Bill(null)}>Close</button>
          </div>
          <A4Invoice bill={a4Bill} />
        </div>,
        document.body
      )}
    </div>
  );
};

export default BillingPage;
