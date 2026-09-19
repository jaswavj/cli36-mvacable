import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { accountApi, accountData, accountError } from '../../../api/account-reports/account-report-api-service';
import { adminApi, adminData } from '../../../api/admin/admin-api-service';
import '../master/Master.css';
import { n3, sum, today } from './reportHelpers';
import { useBillDetail } from './BillDetailModal';

type User = { id: number; name: string };
type Bill = {
  billNo: string; customer: string; total: number; payable: number; paid: number;
  cash: number; bank: number; balance: number; pendingBalance: number; date: string; time: string; biller: string;
};
type Due = {
  customer: string; balance: number; cashPaid: number; bankPaid: number; mode: string;
  bankOption: string; date: string; time: string; biller: string;
};

const SalesReportPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [mode, setMode] = useState('0');
  const [type, setType] = useState('0');
  const [userId, setUserId] = useState('0');
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [dues, setDues] = useState<Due[]>([]);
  const { openBill, billModal } = useBillDetail();

  useEffect(() => {
    adminApi.users().then((res) => setUsers(adminData<User[]>(res) || [])).catch(() => undefined);
  }, []);

  const search = async () => {
    try {
      const data = accountData<{ bills: Bill[]; dues: Due[] }>(await accountApi.sales(from, to, Number(mode), Number(type), Number(userId)));
      setBills(data.bills || []);
      setDues(data.dues || []);
    } catch (err) {
      toast.error(accountError(err, 'Could not load sales report'));
    }
  };

  const showCash = mode !== '2';
  const showBank = mode !== '1';

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-file-invoice" /> Sales Report</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Mode</label>
            <select className="mst-sel" value={mode} onChange={(e) => { setMode(e.target.value); if (e.target.value !== '2') setType('0'); }}>
              <option value="0">All Mode</option>
              <option value="1">Cash</option>
              <option value="2">Bank</option>
            </select>
          </div>
          <div className="mst-fg">
            <label>Type</label>
            <select className="mst-sel" value={type} disabled={mode !== '2'} onChange={(e) => setType(e.target.value)}>
              <option value="0">All Type</option>
              <option value="1">UPI</option>
              <option value="2">Debit Card</option>
              <option value="3">Credit Card</option>
              <option value="4">Net Banking</option>
              <option value="5">Wallet</option>
            </select>
          </div>
          <div className="mst-fg">
            <label>User</label>
            <select className="mst-sel" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="0">All Users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="mst-actions"><button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate Report</button></div>
        </div>
      </div>
      {bills && (
        <>
          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-h">Sales {from} — {to}</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th><th>Bill No</th><th>Customer</th><th className="num">Total</th><th className="num">Payable</th><th className="num">Paid</th>
                    {showCash && <th className="num">Cash</th>}
                    {showBank && <th className="num">Bank</th>}
                    <th className="num">Balance</th><th className="num">Pending</th><th>Date</th><th>Time</th><th>Biller</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length === 0 && <tr><td colSpan={13} className="mst-empty">No sales found.</td></tr>}
                  {bills.map((row, i) => (
                    <tr key={`${row.billNo}-${i}`} className="mst-click-row" onClick={() => openBill(row.billNo)}>
                      <td>{i + 1}</td>
                      <td>{row.billNo}</td>
                      <td>{row.customer}</td>
                      <td className="num">{n3(row.total)}</td>
                      <td className="num">{n3(row.payable)}</td>
                      <td className="num">{n3(row.paid)}</td>
                      {showCash && <td className="num">{n3(row.cash)}</td>}
                      {showBank && <td className="num">{n3(row.bank)}</td>}
                      <td className="num">{n3(row.balance)}</td>
                      <td className="num">{n3(row.pendingBalance)}</td>
                      <td>{row.date}</td>
                      <td>{row.time}</td>
                      <td>{row.biller}</td>
                    </tr>
                  ))}
                  {bills.length > 0 && (
                    <tr>
                      <td colSpan={3}><strong>Grand Total</strong></td>
                      <td className="num"><strong>{n3(sum(bills, 'total'))}</strong></td>
                      <td className="num"><strong>{n3(sum(bills, 'payable'))}</strong></td>
                      <td className="num"><strong>{n3(sum(bills, 'paid'))}</strong></td>
                      {showCash && <td className="num"><strong>{n3(sum(bills, 'cash'))}</strong></td>}
                      {showBank && <td className="num"><strong>{n3(sum(bills, 'bank'))}</strong></td>}
                      <td className="num"><strong>{n3(sum(bills, 'balance'))}</strong></td>
                      <td className="num"><strong>{n3(sum(bills, 'pendingBalance'))}</strong></td>
                      <td colSpan={3} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">Due Collection {from} — {to}</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th><th>Customer</th><th className="num">Balance</th><th className="num">Cash Paid</th>
                    <th className="num">Bank Paid</th><th>Mode</th><th>Bank Option</th><th>Date</th><th>Time</th><th>Biller</th>
                  </tr>
                </thead>
                <tbody>
                  {dues.length === 0 && <tr><td colSpan={10} className="mst-empty">No due collections.</td></tr>}
                  {dues.map((row, i) => (
                    <tr key={`${row.customer}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{row.customer}</td>
                      <td className="num">{n3(row.balance)}</td>
                      <td className="num">{n3(row.cashPaid)}</td>
                      <td className="num">{n3(row.bankPaid)}</td>
                      <td>{row.mode}</td>
                      <td>{row.bankOption}</td>
                      <td>{row.date}</td>
                      <td>{row.time}</td>
                      <td>{row.biller}</td>
                    </tr>
                  ))}
                  {dues.length > 0 && (
                    <tr>
                      <td colSpan={3}><strong>Grand Total</strong></td>
                      <td className="num"><strong>{n3(sum(dues, 'cashPaid'))}</strong></td>
                      <td className="num"><strong>{n3(sum(dues, 'bankPaid'))}</strong></td>
                      <td colSpan={5} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {billModal}
    </div>
  );
};

export default SalesReportPage;
