import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { accountApi, accountData, accountError } from '../../../api/account-reports/account-report-api-service';
import { usersApi, usersData } from '../../../api/users/users-api-service';
import '../master/Master.css';
import { n3, sum, today } from './reportHelpers';
import { useBillDetail } from './BillDetailModal';

type Opt = { id: number; name: string; isActive?: number };
type Row = {
  billNo: string; total: number; discount: number; payable: number; paid: number;
  date: string; time: string; customer: string; pendingBalance: number; attender: string;
};

const SalesByAttenderPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [attenderId, setAttenderId] = useState('0');
  const [attenders, setAttenders] = useState<Opt[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const { openBill, billModal } = useBillDetail();

  useEffect(() => {
    usersApi.attenders()
      .then((res) => setAttenders((usersData<Opt[]>(res) || []).filter((a) => a.isActive !== 0)))
      .catch(() => undefined);
  }, []);

  const search = async () => {
    try {
      setRows(accountData<Row[]>(await accountApi.salesByAttender(from, to, Number(attenderId))) || []);
    } catch (err) {
      toast.error(accountError(err, 'Could not load report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-user-tie" /> Sales by Attender</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Attender</label>
            <select className="mst-sel" value={attenderId} onChange={(e) => setAttenderId(e.target.value)}>
              <option value="0">All Attenders</option>
              {attenders.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
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
                  <th>#</th><th>Bill No</th><th>Customer</th><th>Attender</th>
                  <th className="num">Total</th><th className="num">Discount</th><th className="num">Payable</th>
                  <th className="num">Paid</th><th className="num">Pending</th><th>Date</th><th>Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={11} className="mst-empty">No records.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={`${row.billNo}-${i}`} className="mst-click-row" onClick={() => openBill(row.billNo)}>
                    <td>{i + 1}</td>
                    <td>{row.billNo}</td>
                    <td>{row.customer}</td>
                    <td>{row.attender}</td>
                    <td className="num">{n3(row.total)}</td>
                    <td className="num">{n3(row.discount)}</td>
                    <td className="num">{n3(row.payable)}</td>
                    <td className="num">{n3(row.paid)}</td>
                    <td className="num">{n3(row.pendingBalance)}</td>
                    <td>{row.date}</td>
                    <td>{row.time}</td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr>
                    <td colSpan={4}><strong>Grand Total</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'total'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'discount'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'payable'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'paid'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'pendingBalance'))}</strong></td>
                    <td colSpan={2} />
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

export default SalesByAttenderPage;
