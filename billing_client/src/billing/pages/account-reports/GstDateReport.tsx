import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { accountData, accountError } from '../../../api/account-reports/account-report-api-service';
import '../master/Master.css';
import { n2, today } from './reportHelpers';
import { useBillDetail } from './BillDetailModal';

export type GstCol = { key: string; label: string; num?: boolean; total?: boolean };

type Props = {
  title: string;
  icon: string;
  columns: GstCol[];
  fetchRows: (from: string, to: string) => Promise<any>;
};

const GstDateReport: React.FC<Props> = ({ title, icon, columns, fetchRows }) => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<any[] | null>(null);
  const { openBill, billModal } = useBillDetail();

  const search = async () => {
    try {
      setRows(accountData<any[]>(await fetchRows(from, to)) || []);
    } catch (err) {
      toast.error(accountError(err, 'Could not load GST report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className={icon} /> {title}</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-actions"><button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate Report</button></div>
        </div>
      </div>
      {rows && (
        <div className="mst-card">
          <div className="mst-card-h">{from} — {to}</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th>
                  {columns.map((c) => <th key={c.key} className={c.num ? 'num' : undefined}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={columns.length + 1} className="mst-empty">No records.</td></tr>}
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={row.billNo ? 'mst-click-row' : undefined}
                    onClick={() => row.billNo && openBill(row.billNo)}
                  >
                    <td>{i + 1}</td>
                    {columns.map((c) => (
                      <td key={c.key} className={c.num ? 'num' : undefined}>
                        {c.num ? n2(row[c.key]) : (row[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length > 0 && columns.some((c) => c.total) && (
                  <tr>
                    <td><strong>Total</strong></td>
                    {columns.map((c, idx) => (
                      <td key={c.key} className={c.num ? 'num' : undefined}>
                        {c.total ? <strong>{n2(rows.reduce((s, r) => s + Number(r[c.key] || 0), 0))}</strong> : idx === 0 ? '' : ''}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {billModal}
    </div>
  );
};

export default GstDateReport;
