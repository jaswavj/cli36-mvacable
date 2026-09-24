import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  stockApi,
  stockData,
  stockError,
  type StockSale,
  type StockSaleReport,
} from '../../../api/stock/stock-api-service';
import '../master/Master.css';
import '../customer/Customer.css';
import '../collection/Collection.css';

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);
const show = (v?: string) => (v && v.trim() ? v : '—');

const AdminStockSalesPage: React.FC = () => {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<StockSaleReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<StockSale | null>(null);
  const [cancelling, setCancelling] = useState<StockSale | null>(null);
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');

  const search = async () => {
    if (!from || !to) {
      toast.warning('Select from and to date');
      return;
    }
    if (to < from) {
      toast.warning('To date cannot be before from date');
      return;
    }
    setBusy(true);
    try {
      setData(stockData<StockSaleReport>(await stockApi.saleReport(from, to)));
    } catch (err) {
      toast.error(stockError(err, 'Could not load sales'));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (row: StockSale) => {
    setCancelling(null);
    setEditing(row);
    setQty(String(row.qty ?? ''));
    setRate(String(row.rate ?? ''));
    setNotes(row.notes || '');
    setReason('');
  };

  const openCancel = (row: StockSale) => {
    setEditing(null);
    setCancelling(row);
    setReason('');
  };

  const saveEdit = async () => {
    if (!editing) return;
    const nextQty = Number(qty);
    const nextRate = Number(rate);
    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      toast.warning('Enter a valid quantity');
      return;
    }
    if (!Number.isFinite(nextRate) || nextRate < 0) {
      toast.warning('Enter a valid rate');
      return;
    }
    if (!reason.trim()) {
      toast.warning('Enter reason');
      return;
    }
    setBusy(true);
    try {
      await stockApi.updateSale(editing.id, {
        qty: nextQty,
        rate: nextRate,
        notes: notes.trim(),
        reason: reason.trim(),
      });
      toast.success('Sale updated');
      setEditing(null);
      await search();
    } catch (err) {
      toast.error(stockError(err, 'Could not update sale'));
    } finally {
      setBusy(false);
    }
  };

  const saveCancel = async () => {
    if (!cancelling) return;
    if (!reason.trim()) {
      toast.warning('Enter cancel reason');
      return;
    }
    setBusy(true);
    try {
      await stockApi.cancelSale(cancelling.id, reason.trim());
      toast.success('Sale cancelled');
      setCancelling(null);
      await search();
    } catch (err) {
      toast.error(stockError(err, 'Could not cancel sale'));
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.rows || [];

  return (
    <div className="mst-page col-report">
      <h2 className="mst-title">
        <i className="fas fa-edit" /> Edit Sale
      </h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg">
            <label>From Date</label>
            <input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>To Date</label>
            <input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={search}>
              {busy ? 'Loading…' : 'Show'}
            </button>
          </div>
        </div>
      </div>

      {data && (
        <div className="mst-card">
          <div className="mst-card-h">
            Sales
            <em className="trp-count">{rows.length}</em>
            <span style={{ marginLeft: 'auto' }}>
              Qty {Number(data.totalQty || 0)} · ₹ {n(data.totalAmount)}
            </span>
          </div>
          <div className="col-rep-list">
            {rows.length === 0 && <div className="mst-empty">No sales in this date range.</div>}
            {rows.map((row) => (
              <article key={row.id} className="col-rep-item">
                <div className="col-rep-item-h">
                  <strong>{show(row.productName)}</strong>
                  <span className="col-rep-amt">₹ {n(row.amount)}</span>
                </div>
                <div className="col-rep-item-m">
                  <span>
                    {show(row.saleDate)} {show(row.saleTime)}
                  </span>
                  <span>Qty {Number(row.qty || 0)}</span>
                  <span>₹ {n(row.rate)}</span>
                </div>
                <div className="col-rep-item-f" style={{ justifyContent: 'flex-end' }}>
                  <button className="mst-btn mst-btn-outline" type="button" onClick={() => openEdit(row)}>
                    Edit
                  </button>
                  <button className="mst-btn mst-btn-danger" type="button" onClick={() => openCancel(row)}>
                    Cancel
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="mst-table-wrap col-rep-table">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Product</th>
                  <th className="num">Qty</th>
                  <th className="num">Rate</th>
                  <th className="num">Amount</th>
                  <th>Notes</th>
                  <th>User</th>
                  <th style={{ width: 130 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="mst-empty">
                      No sales in this date range.
                    </td>
                  </tr>
                )}
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{show(row.saleDate)}</td>
                    <td>{show(row.saleTime)}</td>
                    <td>
                      <strong>{show(row.productName)}</strong>
                    </td>
                    <td className="num">{Number(row.qty || 0)}</td>
                    <td className="num">₹ {n(row.rate)}</td>
                    <td className="num">
                      <strong>₹ {n(row.amount)}</strong>
                    </td>
                    <td>{show(row.notes)}</td>
                    <td>{show(row.soldBy)}</td>
                    <td>
                      <button className="mst-icon-btn" type="button" title="Edit" onClick={() => openEdit(row)}>
                        <i className="fas fa-edit" />
                      </button>
                      <button className="mst-icon-btn danger" type="button" title="Cancel" onClick={() => openCancel(row)}>
                        <i className="fas fa-times" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <div className="cust-modal" onClick={() => !busy && setEditing(null)}>
          <div className="cust-modal-box narrow" onClick={(e) => e.stopPropagation()}>
            <div className="cust-modal-h">
              <div>
                <h3>Edit Sale</h3>
                <p>
                  {editing.productName} · Qty {Number(editing.qty || 0)} · ₹ {n(editing.amount)}
                </p>
              </div>
              <button className="mst-icon-btn" type="button" onClick={() => setEditing(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="cust-modal-b">
              <div className="mst-fg">
                <label>Qty</label>
                <input className="mst-inp" type="number" min="0" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div className="mst-fg">
                <label>Rate</label>
                <input className="mst-inp" type="number" min="0" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} />
              </div>
              <div className="mst-fg span-2">
                <label>Notes</label>
                <textarea className="mst-inp" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="mst-fg span-2">
                <label>Reason</label>
                <textarea className="mst-inp" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being edited?" />
              </div>
            </div>
            <div className="cust-modal-f">
              <button className="mst-btn mst-btn-outline" type="button" disabled={busy} onClick={() => setEditing(null)}>
                Close
              </button>
              <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={saveEdit}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelling && (
        <div className="cust-modal" onClick={() => !busy && setCancelling(null)}>
          <div className="cust-modal-box narrow" onClick={(e) => e.stopPropagation()}>
            <div className="cust-modal-h">
              <div>
                <h3>Cancel Sale</h3>
                <p>
                  {cancelling.productName} · Qty {Number(cancelling.qty || 0)} · ₹ {n(cancelling.amount)}
                </p>
              </div>
              <button className="mst-icon-btn" type="button" onClick={() => setCancelling(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="cust-modal-b">
              <div className="mst-fg span-2">
                <label>Reason</label>
                <textarea className="mst-inp" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this sale cancelled?" />
              </div>
            </div>
            <div className="cust-modal-f">
              <button className="mst-btn mst-btn-outline" type="button" disabled={busy} onClick={() => setCancelling(null)}>
                Close
              </button>
              <button className="mst-btn mst-btn-danger" type="button" disabled={busy} onClick={saveCancel}>
                {busy ? 'Saving…' : 'Cancel Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStockSalesPage;
