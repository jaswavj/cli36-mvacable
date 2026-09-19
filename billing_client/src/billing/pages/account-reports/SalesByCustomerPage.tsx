import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { accountApi, accountData, accountError } from '../../../api/account-reports/account-report-api-service';
import { masterApi, masterData } from '../../../api/master/master-api-service';
import '../master/Master.css';
import { n3, sum, today } from './reportHelpers';
import { useBillDetail } from './BillDetailModal';

type Opt = { id: number; name: string };
type Row = {
  billNo: string; total: number; discount: number; payable: number; paid: number;
  balance: number; pendingBalance: number; date: string; time: string; biller: string;
};

const SalesByCustomerPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Opt[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const { openBill, billModal } = useBillDetail();

  useEffect(() => {
    masterApi.customers().then((res) => setCustomers(masterData<Opt[]>(res) || [])).catch(() => undefined);
  }, []);

  const search = async () => {
    if (!customerId) {
      toast.error('Please select a customer');
      return;
    }
    try {
      setRows(accountData<Row[]>(await accountApi.salesByCustomer(from, to, Number(customerId))) || []);
    } catch (err) {
      toast.error(accountError(err, 'Could not load report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-user" /> Sales by Customer</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Customer</label>
            <select className="mst-sel" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select Customer</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                  <th>#</th><th>Bill No</th><th className="num">Total</th><th className="num">Discount</th>
                  <th className="num">Payable</th><th className="num">Paid</th><th className="num">Balance</th>
                  <th className="num">Pending</th><th>Date</th><th>Time</th><th>Biller</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={11} className="mst-empty">No records.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={`${row.billNo}-${i}`} className="mst-click-row" onClick={() => openBill(row.billNo)}>
                    <td>{i + 1}</td>
                    <td>{row.billNo}</td>
                    <td className="num">{n3(row.total)}</td>
                    <td className="num">{n3(row.discount)}</td>
                    <td className="num">{n3(row.payable)}</td>
                    <td className="num">{n3(row.paid)}</td>
                    <td className="num">{n3(row.balance)}</td>
                    <td className="num">{n3(row.pendingBalance)}</td>
                    <td>{row.date}</td>
                    <td>{row.time}</td>
                    <td>{row.biller}</td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr>
                    <td colSpan={2}><strong>Grand Total</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'total'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'discount'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'payable'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'paid'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'balance'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'pendingBalance'))}</strong></td>
                    <td colSpan={3} />
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

export default SalesByCustomerPage;
