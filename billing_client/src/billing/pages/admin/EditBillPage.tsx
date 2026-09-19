import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, adminData, adminError } from '../../../api/admin/admin-api-service';
import '../master/Master.css';

type User = { id: number; name: string };
type Bill = { id: number; billNo: string; total: number; discount: number; payable: number; paid: number; balance: number; date: string; time: string; userName: string };
type Due = { customerName: string; balance: number; cashPaid: number; bankPaid: number; mode: string; bank: string; date: string; time: string; userName: string };
type Line = { id: number; productName: string; qty: number; price: number; disc: number; total: number };
type Detail = {
  id: number; billNo: string; date: string; total: number; prodDisc: number; extraDisc: number;
  payable: number; paid: number; cash: number; bank: number; balance: number; currentBalance: number;
  cancelBlockMsg?: string | null; lines: Line[];
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(3);

const EditBillPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [userId, setUserId] = useState('0');
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [view, setView] = useState<'list' | 'edit' | 'cancel'>('list');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.users().then((res) => setUsers(adminData<User[]>(res) || [])).catch(() => undefined);
  }, []);

  const search = async () => {
    try {
      const data = adminData<{ bills: Bill[]; dues: Due[] }>(await adminApi.bills(from, to, userId === '0' ? undefined : Number(userId)));
      setBills(data.bills || []);
      setDues(data.dues || []);
      setView('list');
      setDetail(null);
    } catch (err) {
      toast.error(adminError(err, 'Could not load bills'));
    }
  };

  const open = async (id: number, mode: 'edit' | 'cancel') => {
    try {
      const data = adminData<Detail>(await adminApi.billDetail(id));
      setDetail(data);
      setNewDate(data.date);
      setReason('');
      setView(mode);
    } catch (err) {
      toast.error(adminError(err, 'Could not load bill'));
    }
  };

  const saveDate = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await adminApi.updateBillDate(detail.id, newDate);
      toast.success('Bill date updated');
      await open(detail.id, 'edit');
    } catch (err) {
      toast.error(adminError(err, 'Failed to update bill date'));
    } finally {
      setBusy(false);
    }
  };

  const cancelBill = async () => {
    if (!detail || !reason.trim()) {
      toast.warning('Enter a cancellation reason');
      return;
    }
    setBusy(true);
    try {
      await adminApi.cancelBill(detail.id, reason.trim());
      toast.success('Bill cancelled');
      setView('list');
      setDetail(null);
      await search();
    } catch (err) {
      toast.error(adminError(err, 'Could not cancel bill'));
    } finally {
      setBusy(false);
    }
  };

  const totals = bills.reduce((a, b) => ({
    total: a.total + (b.total || 0),
    discount: a.discount + (b.discount || 0),
    payable: a.payable + (b.payable || 0),
    paid: a.paid + (b.paid || 0),
    balance: a.balance + (b.balance || 0),
  }), { total: 0, discount: 0, payable: 0, paid: 0, balance: 0 });

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-edit" /> Edit Date / Cancel Bill</h2>
      {view !== 'list' && (
        <button className="mst-btn mst-btn-outline" type="button" style={{ marginBottom: 10 }} onClick={() => setView('list')}>
          <i className="fas fa-arrow-left" /> Back
        </button>
      )}
      {view === 'list' && (
        <>
          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-b mst-form">
              <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
              <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
              <div className="mst-fg">
                <label>Select User</label>
                <select className="mst-sel" value={userId} onChange={(e) => setUserId(e.target.value)}>
                  <option value="0">-- All User --</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="mst-actions">
                <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate Report</button>
              </div>
            </div>
          </div>
          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-h">Sales Report From: {from} – {to}</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th><th>Bill No</th><th className="num">Total</th><th className="num">Discount</th>
                    <th className="num">Payable</th><th className="num">Paid</th><th className="num">Balance</th>
                    <th>Date</th><th>Time</th><th>Biller</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.length === 0 ? <tr><td colSpan={11} className="mst-empty">No bills found.</td></tr> : bills.map((row, i) => (
                    <tr key={row.id}>
                      <td>{i + 1}</td>
                      <td>{row.billNo}</td>
                      <td className="num">{n(row.total)}</td>
                      <td className="num">{n(row.discount)}</td>
                      <td className="num">{n(row.payable)}</td>
                      <td className="num">{n(row.paid)}</td>
                      <td className="num">{n(row.balance)}</td>
                      <td>{row.date}</td>
                      <td>{row.time}</td>
                      <td>{row.userName}</td>
                      <td>
                        <button className="mst-icon-btn" type="button" onClick={() => open(row.id, 'edit')}><i className="fas fa-pen" /> Edit</button>
                        <button className="mst-icon-btn danger" type="button" onClick={() => open(row.id, 'cancel')}><i className="fas fa-ban" /> Cancel</button>
                      </td>
                    </tr>
                  ))}
                  {bills.length > 0 && (
                    <tr>
                      <td colSpan={2}><strong>Grand Total</strong></td>
                      <td className="num"><strong>{n(totals.total)}</strong></td>
                      <td className="num"><strong>{n(totals.discount)}</strong></td>
                      <td className="num"><strong>{n(totals.payable)}</strong></td>
                      <td className="num"><strong>{n(totals.paid)}</strong></td>
                      <td className="num"><strong>{n(totals.balance)}</strong></td>
                      <td colSpan={4} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">Due Collection Report From: {from} – {to}</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th><th>Customer</th><th className="num">Balance</th><th className="num">Cash Paid</th>
                    <th className="num">Bank Paid</th><th>Mode</th><th>Bank Option</th><th>Date</th><th>Time</th><th>Biller</th>
                  </tr>
                </thead>
                <tbody>
                  {dues.length === 0 ? <tr><td colSpan={10} className="mst-empty">No due collections.</td></tr> : dues.map((row, i) => (
                    <tr key={`${row.date}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{row.customerName}</td>
                      <td className="num">{n(row.balance)}</td>
                      <td className="num">{n(row.cashPaid)}</td>
                      <td className="num">{n(row.bankPaid)}</td>
                      <td>{row.mode}</td>
                      <td>{row.bank}</td>
                      <td>{row.date}</td>
                      <td>{row.time}</td>
                      <td>{row.userName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      {detail && view !== 'list' && (
        <div className="mst-card">
          <div className="mst-card-h">Bill Details (Bill No: {detail.billNo})</div>
          <div className="mst-card-b">
            {view === 'edit' && (
              <div className="mst-form" style={{ marginBottom: 16 }}>
                <div className="mst-fg">
                  <label>Bill Date</label>
                  <input className="mst-inp" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                </div>
                <div className="mst-actions">
                  <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={saveDate}>Update Date</button>
                </div>
              </div>
            )}
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead><tr><th>#</th><th>Product</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Discount</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {detail.lines.map((line, i) => (
                    <tr key={line.id}><td>{i + 1}</td><td>{line.productName}</td><td className="num">{line.qty}</td><td className="num">{n(line.price)}</td><td className="num">{n(line.disc)}</td><td className="num">{n(line.total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <table className="mst-table" style={{ maxWidth: 420, marginTop: 16 }}>
              <tbody>
                <tr><th>Total</th><td className="num">{n(detail.total)}</td></tr>
                <tr><th>Product Discount</th><td className="num">{n(detail.prodDisc)}</td></tr>
                <tr><th>Extra Discount</th><td className="num">{n(detail.extraDisc)}</td></tr>
                <tr><th>Payable</th><td className="num">{n(detail.payable)}</td></tr>
                <tr><th>Paid</th><td className="num">{n(detail.paid)}</td></tr>
                <tr><th>Cash Paid</th><td className="num">{n(detail.cash)}</td></tr>
                <tr><th>Bank Paid</th><td className="num">{n(detail.bank)}</td></tr>
                <tr><th>Balance</th><td className="num">{n(detail.balance)}</td></tr>
                <tr><th>Pending Balance</th><td className="num">{n(detail.currentBalance)}</td></tr>
              </tbody>
            </table>
            {view === 'cancel' && (
              <div className="mst-form one-col" style={{ marginTop: 16, maxWidth: 480 }}>
                {detail.cancelBlockMsg && <div className="mst-block">{detail.cancelBlockMsg}</div>}
                <div className="mst-fg">
                  <label>Reason for Cancellation</label>
                  <textarea className="mst-area" value={reason} disabled={!!detail.cancelBlockMsg} onChange={(e) => setReason(e.target.value)} />
                </div>
                <div className="mst-actions">
                  <button className="mst-btn mst-btn-danger" type="button" disabled={busy || !!detail.cancelBlockMsg} onClick={cancelBill}>Cancel Bill</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditBillPage;
