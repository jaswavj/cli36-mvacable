import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  collectionApi,
  collectionData,
  collectionError,
  type CollectionReport,
  type CollectionReportRow,
  type PayMode,
} from '../../../api/collection/collection-api-service';
import PageBar, { PAGE_SIZE } from '../../components/PageBar';
import '../master/Master.css';
import '../customer/Customer.css';
import '../collection/Collection.css';

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const n = (v?: number) => Number(v || 0).toFixed(0);
const payLabel = (mode?: string) => (mode === 'upi' ? 'UPI' : mode === 'cash' ? 'Cash' : mode || '—');
const toIso = (dmy?: string) => {
  if (!dmy || !dmy.includes('-')) return today();
  const [dd, mm, yyyy] = dmy.split('-');
  return `${yyyy}-${mm}-${dd}`;
};

const AdminCollectionsPage: React.FC = () => {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<CollectionReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<CollectionReportRow | null>(null);
  const [cancelling, setCancelling] = useState<CollectionReportRow | null>(null);
  const [amount, setAmount] = useState('');
  const [payMode, setPayMode] = useState<PayMode>('cash');
  const [paidDate, setPaidDate] = useState(today);
  const [reason, setReason] = useState('');

  const search = async (nextPage = 1) => {
    const pageNo = Number(nextPage);
    const safePage = Number.isFinite(pageNo) && pageNo > 0 ? pageNo : 1;
    if (!from || !to) {
      toast.warning('Select from and to date');
      return;
    }
    setBusy(true);
    try {
      setPage(safePage);
      setData(collectionData<CollectionReport>(await collectionApi.report(from, to, undefined, undefined, undefined, safePage, PAGE_SIZE)));
    } catch (err) {
      toast.error(collectionError(err, 'Could not load collections'));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (row: CollectionReportRow) => {
    setCancelling(null);
    setEditing(row);
    setAmount(String(row.amount || ''));
    setPayMode(row.payMode === 'upi' ? 'upi' : 'cash');
    setPaidDate(toIso(row.paidDate));
    setReason('');
  };

  const openCancel = (row: CollectionReportRow) => {
    setEditing(null);
    setCancelling(row);
    setReason('');
  };

  const saveEdit = async () => {
    if (!editing) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.warning('Enter a valid amount');
      return;
    }
    if (!paidDate) {
      toast.warning('Select paid date');
      return;
    }
    if (!reason.trim()) {
      toast.warning('Enter reason');
      return;
    }
    setBusy(true);
    try {
      await collectionApi.update(editing.id, {
        amount: value,
        payMode,
        paidDate,
        reason: reason.trim(),
      });
      toast.success('Collection updated');
      setEditing(null);
      await search(page);
    } catch (err) {
      toast.error(collectionError(err, 'Could not update collection'));
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
      await collectionApi.cancel(cancelling.id, reason.trim());
      toast.success('Collection cancelled');
      setCancelling(null);
      await search(page);
    } catch (err) {
      toast.error(collectionError(err, 'Could not cancel collection'));
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.rows || [];

  return (
    <div className="mst-page col-report">
      <h2 className="mst-title">
        <i className="fas fa-edit" /> Edit Collection
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
            <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={() => search(1)}>
              {busy ? 'Loading…' : 'Show'}
            </button>
          </div>
        </div>
      </div>

      {data && (
        <div className="mst-card">
          <div className="mst-card-h">
            Collections
            <em className="trp-count">{rows.length}</em>
          </div>
          <div className="col-rep-list">
            {rows.length === 0 && <div className="mst-empty">No collections in this date range.</div>}
            {rows.map((row) => (
              <article key={row.id} className="col-rep-item">
                <div className="col-rep-item-h">
                  <strong>
                    {row.customerName || row.customerId} ({row.customerId})
                  </strong>
                  <span className="col-rep-amt">₹ {n(row.amount)}</span>
                </div>
                <div className="col-rep-item-m">
                  <span>{row.monthLabel}</span>
                  <span>{payLabel(row.payMode)}</span>
                  <span>
                    {row.paidDate} {row.paidTime}
                  </span>
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
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>Month</th>
                  <th>Mode</th>
                  <th className="num">Amount</th>
                  <th>User</th>
                  <th style={{ width: 130 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="mst-empty">
                      No collections in this date range.
                    </td>
                  </tr>
                )}
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.paidDate || '—'}</td>
                    <td>{row.paidTime || '—'}</td>
                    <td>
                      <strong>{row.customerId}</strong>
                    </td>
                    <td>{row.customerName || '—'}</td>
                    <td>{row.monthLabel || '—'}</td>
                    <td>{payLabel(row.payMode)}</td>
                    <td className="num">
                      <strong>₹ {n(row.amount)}</strong>
                    </td>
                    <td>{row.collectedBy || '—'}</td>
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
          <PageBar page={page} total={data.count || 0} onPage={(next) => search(next)} />
        </div>
      )}

      {editing && (
        <div className="cust-modal" onClick={() => !busy && setEditing(null)}>
          <div className="cust-modal-box narrow" onClick={(e) => e.stopPropagation()}>
            <div className="cust-modal-h">
              <div>
                <h3>Edit Collection</h3>
                <p>
                  {editing.customerName} ({editing.customerId}) · {editing.monthLabel}
                </p>
              </div>
              <button className="mst-icon-btn" type="button" onClick={() => setEditing(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="cust-modal-b">
              <div className="mst-fg">
                <label>Amount</label>
                <input className="mst-inp" type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="mst-fg">
                <label>Payment</label>
                <select className="mst-sel" value={payMode} onChange={(e) => setPayMode(e.target.value as PayMode)}>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <div className="mst-fg span-2">
                <label>Paid Date</label>
                <input className="mst-inp" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
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
                <h3>Cancel Collection</h3>
                <p>
                  {cancelling.customerName} ({cancelling.customerId}) · ₹ {n(cancelling.amount)}
                </p>
              </div>
              <button className="mst-icon-btn" type="button" onClick={() => setCancelling(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="cust-modal-b">
              <div className="mst-fg span-2">
                <label>Reason</label>
                <textarea className="mst-inp" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this collection cancelled?" />
              </div>
            </div>
            <div className="cust-modal-f">
              <button className="mst-btn mst-btn-outline" type="button" disabled={busy} onClick={() => setCancelling(null)}>
                Close
              </button>
              <button className="mst-btn mst-btn-danger" type="button" disabled={busy} onClick={saveCancel}>
                {busy ? 'Saving…' : 'Cancel Collection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCollectionsPage;
