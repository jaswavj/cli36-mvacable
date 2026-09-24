import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { stockApi, stockData, stockError, type StockSaleLog } from '../../../api/stock/stock-api-service';
import '../master/Master.css';
import '../collection/Collection.css';

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);
const show = (v?: string) => (v && v.trim() ? v : '—');
const actionLabel = (action?: string) => (action === 'cancel' ? 'Cancel' : 'Edit');

const AdminStockSaleLogPage: React.FC = () => {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<StockSaleLog[] | null>(null);
  const [busy, setBusy] = useState(false);

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
      setRows(stockData<StockSaleLog[]>(await stockApi.saleLog(from, to)) || []);
    } catch (err) {
      toast.error(stockError(err, 'Could not load sale edit log'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page col-report">
      <h2 className="mst-title">
        <i className="fas fa-history" /> Sale Edit Log
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
            Sale changes
            <em className="trp-count">{rows.length}</em>
          </div>
          <div className="col-rep-list">
            {rows.length === 0 && <div className="mst-empty">No sale edit log in this date range.</div>}
            {rows.map((row) => (
              <article key={row.id} className="col-rep-item">
                <div className="col-rep-item-h">
                  <strong>
                    {actionLabel(row.action)} · {show(row.productName)}
                  </strong>
                  <span className="col-rep-amt">₹ {n(row.newAmount)}</span>
                </div>
                <div className="col-rep-item-m">
                  <span>
                    Qty {Number(row.oldQty || 0)} → {Number(row.newQty || 0)}
                  </span>
                  <span>
                    ₹ {n(row.oldRate)} → ₹ {n(row.newRate)}
                  </span>
                  <span>
                    ₹ {n(row.oldAmount)} → ₹ {n(row.newAmount)}
                  </span>
                </div>
                <div className="col-rep-item-f">
                  <span>
                    {show(row.logDate)} {show(row.logTime)} · {show(row.userName)}
                  </span>
                  <span>{show(row.reason)}</span>
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
                  <th>Product</th>
                  <th>Old</th>
                  <th>New</th>
                  <th>Reason</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="mst-empty">
                      No sale edit log in this date range.
                    </td>
                  </tr>
                )}
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{show(row.logDate)}</td>
                    <td>{show(row.logTime)}</td>
                    <td>
                      <strong>{actionLabel(row.action)}</strong>
                    </td>
                    <td>{show(row.productName)}</td>
                    <td>
                      Qty {Number(row.oldQty || 0)} / ₹ {n(row.oldRate)} / ₹ {n(row.oldAmount)}
                    </td>
                    <td>
                      Qty {Number(row.newQty || 0)} / ₹ {n(row.newRate)} / ₹ {n(row.newAmount)}
                    </td>
                    <td>{show(row.reason)}</td>
                    <td>{show(row.userName)}</td>
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

export default AdminStockSaleLogPage;
