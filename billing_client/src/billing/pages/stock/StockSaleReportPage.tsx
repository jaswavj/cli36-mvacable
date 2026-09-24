import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { stockApi, stockData, stockError, type StockSaleReport } from '../../../api/stock/stock-api-service';
import '../master/Master.css';
import '../collection/Collection.css';

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);
const show = (v?: string) => (v && v.trim() ? v : '—');

const StockSaleReportPage: React.FC = () => {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<StockSaleReport | null>(null);
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
      setData(stockData<StockSaleReport>(await stockApi.saleReport(from, to)));
    } catch (err) {
      toast.error(stockError(err, 'Could not load sale report'));
    } finally {
      setBusy(false);
    }
  };

  const rows = data?.rows || [];

  return (
    <div className="mst-page col-report">
      <h2 className="mst-title">
        <i className="fas fa-chart-bar" /> Sale Report
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
            <em className="trp-count">{data.count || 0}</em>
            <span style={{ marginLeft: 'auto' }}>
              Qty {Number(data.totalQty || 0)} · ₹ {n(data.totalAmount)}
            </span>
          </div>
          <div className="mst-table-wrap">
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
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="mst-empty">
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

export default StockSaleReportPage;
