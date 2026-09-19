import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, adminData, adminError } from '../../../api/admin/admin-api-service';
import '../master/Master.css';

type Row = { billId: number; billNo: string; payable: number; paid: number; reason: string; date: string; time: string; userName: string };

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);

const CancelBillReportPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<Row[] | null>(null);

  const search = async () => {
    try {
      setRows(adminData<Row[]>(await adminApi.cancelReport(from, to)) || []);
    } catch (err) {
      toast.error(adminError(err, 'Could not load report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-ban" /> Cancel Bill Reports</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate</button>
          </div>
        </div>
      </div>
      {rows && (
        <div className="mst-card">
          <div className="mst-card-h">Cancellations from {from} to {to}</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th><th>Bill No</th><th className="num">Payable</th><th className="num">Paid</th>
                  <th>Reason</th><th>Date</th><th>Time</th><th>User</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={8} className="mst-empty">No cancelled bills in this period.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={`${row.billId}-${i}`}>
                    <td>{i + 1}</td>
                    <td>{row.billNo}</td>
                    <td className="num">{n(row.payable)}</td>
                    <td className="num">{n(row.paid)}</td>
                    <td>{row.reason}</td>
                    <td>{row.date}</td>
                    <td>{row.time}</td>
                    <td>{row.userName}</td>
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

export default CancelBillReportPage;
