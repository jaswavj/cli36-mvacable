import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { inventoryApi, invData, invError } from '../../../api/inventory/inventory-api-service';
import '../master/Master.css';
import '../BillingPage.css';

type Line = {
  detailId: number;
  product: string;
  qty: number;
  free: number;
  rate: number;
  mrp: number;
  alreadyReturned: number;
  availableQty: number;
  returnQty: string;
  selected: boolean;
};

type Bill = {
  id: number;
  prno: string;
  invoiceNo: string;
  invoiceDate: string;
  total: number;
  supplierName: string;
};

type ReturnHist = {
  returnNo: string;
  qty: number;
  rate: number;
  total: number;
  notes: string;
  dateTime: string;
  enteredBy: string;
};

const PurchaseReturnPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [bill, setBill] = useState<Bill | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [histLine, setHistLine] = useState<Line | null>(null);
  const [history, setHistory] = useState<ReturnHist[] | null>(null);

  const closeHistory = () => {
    setHistLine(null);
    setHistory(null);
  };

  const load = async () => {
    if (!search.trim()) {
      toast.warning('Enter purchase ID or bill no');
      return;
    }
    try {
      const data = invData<any>(await inventoryApi.purchaseForReturn(search.trim()));
      setBill({
        id: data.id,
        prno: data.prno,
        invoiceNo: data.invoiceNo,
        invoiceDate: data.invoiceDate,
        total: data.total,
        supplierName: data.supplierName,
      });
      setLines(
        (data.items || []).map((item: any) => ({
          ...item,
          returnQty: String(item.availableQty || 0),
          selected: false,
        }))
      );
      closeHistory();
    } catch (err) {
      toast.error(invError(err, 'Purchase not found'));
      setBill(null);
      setLines([]);
    }
  };

  const openHistory = async (line: Line) => {
    try {
      setHistLine(line);
      setHistory(invData<ReturnHist[]>(await inventoryApi.returnHistory(line.detailId)) || []);
    } catch (err) {
      toast.error(invError(err, 'Could not load return details'));
    }
  };

  const canReturn = (line: Line) => line.availableQty > 0;

  const save = async () => {
    const items = lines
      .filter((l) => l.selected && Number(l.returnQty) > 0 && canReturn(l))
      .map((l) => ({ detailId: l.detailId, qty: Number(l.returnQty), rate: l.rate }));
    if (!bill || items.length === 0) {
      toast.warning('Select items to return');
      return;
    }
    setBusy(true);
    try {
      const no = invData<string>(await inventoryApi.saveReturn({ purchaseId: bill.id, notes, items }));
      toast.success(`Return saved: ${no}`);
      setBill(null);
      setLines([]);
      setNotes('');
      closeHistory();
    } catch (err) {
      toast.error(invError(err, 'Return failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-undo" /> Purchase Return
      </h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg">
            <label>Purchase Bill No / ID</label>
            <input className="mst-inp" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Enter Purchase ID or Bill No" />
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={load}>Load Bill</button>
          </div>
        </div>
      </div>
      {bill && (
        <>
          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-b" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span><small className="mst-note">Bill No</small><div><b>{bill.prno}</b></div></span>
              <span><small className="mst-note">Invoice No</small><div><b>{bill.invoiceNo}</b></div></span>
              <span><small className="mst-note">Invoice Date</small><div><b>{bill.invoiceDate}</b></div></span>
              <span><small className="mst-note">Supplier</small><div><b>{bill.supplierName}</b></div></span>
              <span><small className="mst-note">Bill Total</small><div><b>{Number(bill.total || 0).toFixed(3)}</b></div></span>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">Select Items to Return</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        onChange={(e) => setLines((prev) => prev.map((l) => ({ ...l, selected: canReturn(l) ? e.target.checked : false })))}
                      />
                    </th>
                    <th>#</th>
                    <th>Product</th>
                    <th className="num">Orig Qty</th>
                    <th className="num">Free</th>
                    <th className="num">Returned</th>
                    <th className="num">Available</th>
                    <th className="num">Rate</th>
                    <th className="num">Return Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr
                      key={line.detailId}
                      onClick={() => openHistory(line)}
                      style={{ cursor: 'pointer', opacity: canReturn(line) ? 1 : 0.7 }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={line.selected}
                          disabled={!canReturn(line)}
                          onChange={(e) => setLines((prev) => prev.map((l) => (l.detailId === line.detailId ? { ...l, selected: e.target.checked } : l)))}
                        />
                      </td>
                      <td>{i + 1}</td>
                      <td>
                        {line.product}
                        {line.alreadyReturned > 0 && (
                          <span className="mst-badge on" style={{ marginLeft: 8 }}>Returned</span>
                        )}
                      </td>
                      <td className="num">{line.qty}</td>
                      <td className="num">{line.free}</td>
                      <td className="num">{line.alreadyReturned}</td>
                      <td className="num">{line.availableQty}</td>
                      <td className="num">{line.rate}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          className="mst-inp"
                          type="number"
                          min="0"
                          max={line.availableQty}
                          step="0.001"
                          disabled={!canReturn(line)}
                          value={line.returnQty}
                          onChange={(e) => setLines((prev) => prev.map((l) => (l.detailId === line.detailId ? { ...l, returnQty: e.target.value } : l)))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mst-card-b mst-form">
              <div className="mst-fg span-2">
                <label>Notes</label>
                <textarea className="mst-area" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="mst-actions">
                <button className="mst-btn mst-btn-primary" disabled={busy} type="button" onClick={save}>Save Return</button>
              </div>
            </div>
          </div>
        </>
      )}
      {history && histLine && (
        <div className="pos-modal-back" onClick={closeHistory}>
          <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Return details — {histLine.product}</h4>
              <button className="pos-btn pos-btn-outline" type="button" onClick={closeHistory}>Close</button>
            </div>
            <div className="pos-row" style={{ marginBottom: 12 }}>
              <div className="pos-fg">
                <span className="pos-lbl">Orig Qty</span>
                <input className="pos-inp" readOnly value={histLine.qty} />
              </div>
              <div className="pos-fg">
                <span className="pos-lbl">Already Returned</span>
                <input className="pos-inp" readOnly value={histLine.alreadyReturned} />
              </div>
              <div className="pos-fg">
                <span className="pos-lbl">Available</span>
                <input className="pos-inp" readOnly value={histLine.availableQty} />
              </div>
            </div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>Return No</th>
                    <th>Date</th>
                    <th className="num">Qty</th>
                    <th className="num">Rate</th>
                    <th className="num">Total</th>
                    <th>Notes</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 && <tr><td colSpan={7} className="mst-empty">No return records for this item.</td></tr>}
                  {history.map((h, i) => (
                    <tr key={`${h.returnNo}-${i}`}>
                      <td>{h.returnNo}</td>
                      <td>{h.dateTime}</td>
                      <td className="num">{h.qty}</td>
                      <td className="num">{h.rate}</td>
                      <td className="num">{h.total}</td>
                      <td>{h.notes}</td>
                      <td>{h.enteredBy}</td>
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

export default PurchaseReturnPage;
