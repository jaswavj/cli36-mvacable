import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, adminData, adminError } from '../../../api/admin/admin-api-service';
import '../master/Master.css';
import '../credit/Credit.css';

type Row = {
  id: number; dateTime: string; billNo: string; customer: string;
  oldProd: string; newProd: string; type: number; points: number; staff: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const ExchangeReportPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [type, setType] = useState('0');
  const [rows, setRows] = useState<Row[] | null>(null);

  const search = async () => {
    try {
      const t = Number(type);
      setRows(adminData<Row[]>(await adminApi.exchangeReport(from, to, t || undefined)) || []);
    } catch (err) {
      toast.error(adminError(err, 'Could not load report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-undo" /> Exchange &amp; Return Report</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Type</label>
            <select className="mst-sel" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="0">All</option>
              <option value="1">Exchange</option>
              <option value="2">Return</option>
            </select>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate</button>
          </div>
        </div>
      </div>
      {rows && (
        <div className="mst-card">
          <div className="mst-card-h">Records from {from} to {to}</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th><th>Date / Time</th><th>Bill No</th><th>Customer</th>
                  <th>Old Product</th><th>New Product</th><th>Type</th>
                  <th className="num">Points</th><th>Staff</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={9} className="mst-empty">No exchange or return records in this period.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={row.id} className={row.type === 2 ? 'crd-row-old' : 'crd-row-adv'}>
                    <td>{i + 1}</td>
                    <td>{row.dateTime}</td>
                    <td>{row.billNo}</td>
                    <td>{row.customer}</td>
                    <td>{row.oldProd}</td>
                    <td>{row.newProd}</td>
                    <td>
                      <span className={`crd-badge ${row.type === 2 ? 'old' : 'adv'}`}>
                        {row.type === 2 ? 'Return' : 'Exchange'}
                      </span>
                    </td>
                    <td className="num">{Number(row.points || 0).toFixed(2)}</td>
                    <td>{row.staff}</td>
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

export default ExchangeReportPage;
