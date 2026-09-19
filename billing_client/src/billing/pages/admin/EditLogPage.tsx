import React, { useState } from 'react';
import { toast } from 'react-toastify';
import {
  collectionApi,
  collectionData,
  collectionError,
  type CollectionLog,
} from '../../../api/collection/collection-api-service';
import '../master/Master.css';
import '../collection/Collection.css';

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const n = (v?: number) => Number(v || 0).toFixed(0);
const payLabel = (mode?: string) => (mode === 'upi' ? 'UPI' : mode === 'cash' ? 'Cash' : mode || '—');

const EditLogPage: React.FC = () => {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<CollectionLog[] | null>(null);
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (!from || !to) {
      toast.warning('Select from and to date');
      return;
    }
    setBusy(true);
    try {
      setRows(collectionData<CollectionLog[]>(await collectionApi.editLog(from, to)) || []);
    } catch (err) {
      toast.error(collectionError(err, 'Could not load edit log'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page col-report">
      <h2 className="mst-title">
        <i className="fas fa-history" /> Edit Log
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

      {rows && (
        <div className="mst-card">
          <div className="mst-card-h">
            Collection changes
            <em className="trp-count">{rows.length}</em>
          </div>
          <div className="col-rep-list">
            {rows.length === 0 && <div className="mst-empty">No edit log in this date range.</div>}
            {rows.map((row) => (
              <article key={row.id} className="col-rep-item">
                <div className="col-rep-item-h">
                  <strong>
                    {row.action === 'cancel' ? 'Cancel' : 'Edit'} · {row.customerName || row.customerId} ({row.customerId})
                  </strong>
                  <span className="col-rep-amt">₹ {n(row.newAmount)}</span>
                </div>
                <div className="col-rep-item-m">
                  <span>{row.monthLabel}</span>
                  <span>
                    {payLabel(row.oldPayMode)} → {payLabel(row.newPayMode)}
                  </span>
                  <span>
                    ₹ {n(row.oldAmount)} → ₹ {n(row.newAmount)}
                  </span>
                </div>
                <div className="col-rep-item-f">
                  <span>
                    {row.logDate} {row.logTime} · {row.userName}
                  </span>
                  <span>{row.reason}</span>
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
                  <th>Action</th>
                  <th>Customer</th>
                  <th>Month</th>
                  <th>Old</th>
                  <th>New</th>
                  <th>Reason</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="mst-empty">
                      No edit log in this date range.
                    </td>
                  </tr>
                )}
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.logDate || '—'}</td>
                    <td>{row.logTime || '—'}</td>
                    <td>
                      <strong>{row.action === 'cancel' ? 'Cancel' : 'Edit'}</strong>
                    </td>
                    <td>
                      {row.customerName || '—'} ({row.customerId})
                    </td>
                    <td>{row.monthLabel || '—'}</td>
                    <td>
                      ₹ {n(row.oldAmount)} / {payLabel(row.oldPayMode)} / {row.oldPaidDate || '—'}
                    </td>
                    <td>
                      ₹ {n(row.newAmount)} / {payLabel(row.newPayMode)} / {row.newPaidDate || '—'}
                    </td>
                    <td>{row.reason || '—'}</td>
                    <td>{row.userName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditLogPage;
