import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { statsApi, statsData, statsError } from '../../../api/statistics/statistics-api-service';
import '../master/Master.css';
import './Stats.css';

type Row = { date: string; content: string; inAmt: number; outAmt: number; userName: string; type: string };

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);

const BalanceSummaryPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [opening, setOpening] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);

  const search = async () => {
    try {
      const data = statsData<{ opening: number; rows: Row[] }>(await statsApi.balanceSummary(from, to));
      setOpening(data.opening || 0);
      setRows(data.rows || []);
    } catch (err) {
      toast.error(statsError(err, 'Could not load report'));
    }
  };

  let balance = opening || 0;
  let totalIn = 0;
  let totalOut = 0;
  const computed = (rows || []).map((row) => {
    balance += (row.inAmt || 0) - (row.outAmt || 0);
    totalIn += row.inAmt || 0;
    totalOut += row.outAmt || 0;
    return { ...row, closing: balance };
  });

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-scale-balanced" /> Balance Summary</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate Report</button>
          </div>
        </div>
      </div>
      {rows && (
        <>
          <div className="mst-card" style={{ marginBottom: 12, maxWidth: 360 }}>
            <div className="mst-card-b">
              <div className="mst-note">Opening Balance (before {from})</div>
              <div className={`crd-stat-v ${Number(opening) >= 0 ? 'st-pos' : 'st-neg'}`} style={{ fontSize: '1.4rem' }}>{n(opening || 0)}</div>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">Balance Summary: {from} — {to}</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr><th>#</th><th>Date</th><th>Content</th><th className="num">In (+)</th><th className="num">Out (-)</th><th className="num">Closing</th><th>User</th><th>Type</th></tr>
                </thead>
                <tbody>
                  {computed.length === 0 && <tr><td colSpan={8} className="mst-empty">No transactions in this period.</td></tr>}
                  {computed.map((row, i) => (
                    <tr key={`${row.date}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{row.date}</td>
                      <td>{row.content}</td>
                      <td className="num st-pos">{row.inAmt > 0 ? n(row.inAmt) : ''}</td>
                      <td className="num st-neg">{row.outAmt > 0 ? n(row.outAmt) : ''}</td>
                      <td className={`num ${row.closing >= 0 ? 'st-pos' : 'st-neg'}`}>{n(row.closing)}</td>
                      <td>{row.userName}</td>
                      <td><span className={`st-badge ${row.type.replace(' ', '-')}`}>{row.type}</span></td>
                    </tr>
                  ))}
                  {computed.length > 0 && (
                    <tr>
                      <td colSpan={3}><strong>Totals</strong></td>
                      <td className="num st-pos"><strong>{n(totalIn)}</strong></td>
                      <td className="num st-neg"><strong>{n(totalOut)}</strong></td>
                      <td className={`num ${balance >= 0 ? 'st-pos' : 'st-neg'}`}><strong>{n(balance)}</strong></td>
                      <td colSpan={2} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default BalanceSummaryPage;
