import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, adminData, adminError } from '../../../api/admin/admin-api-service';
import '../master/Master.css';
import '../users/Users.css';

type Pay = {
  billId: number; billNo: string; date: string; cusName: string;
  payable: number; paymentType: number; cash: number; bank: number;
};

const ChangePaymentTypePage: React.FC = () => {
  const [billNo, setBillNo] = useState('');
  const [data, setData] = useState<Pay | null>(null);
  const [cash, setCash] = useState('');
  const [bank, setBank] = useState('');
  const [bankMode, setBankMode] = useState('1');
  const [busy, setBusy] = useState(false);

  const search = async () => {
    if (!billNo.trim()) {
      toast.warning('Please enter a bill number.');
      return;
    }
    setBusy(true);
    try {
      const info = adminData<Pay>(await adminApi.payment(billNo.trim()));
      setData(info);
      setCash(Number(info.cash || 0).toFixed(3));
      setBank(Number(info.bank || 0).toFixed(3));
      setBankMode(String(info.paymentType > 0 ? info.paymentType : 1));
    } catch (err) {
      setData(null);
      toast.error(adminError(err, 'Bill not found'));
    } finally {
      setBusy(false);
    }
  };

  const cashN = parseFloat(cash) || 0;
  const bankN = parseFloat(bank) || 0;
  const modeText = cashN > 0 && bankN > 0 ? 'Mode: Mixed (Cash + Bank)' : bankN > 0 ? 'Mode: Bank / Digital only' : cashN > 0 ? 'Mode: Cash only' : 'No payment amount entered.';

  const save = async () => {
    if (!data) return;
    if (cashN < 0 || bankN < 0) {
      toast.error('Amounts cannot be negative.');
      return;
    }
    if (cashN === 0 && bankN === 0) {
      toast.warning('At least one payment amount must be greater than zero.');
      return;
    }
    const total = Math.round((cashN + bankN) * 1000) / 1000;
    const payable = Math.round((data.payable || 0) * 1000) / 1000;
    if (total !== payable) {
      toast.error(`Cash + Bank must equal payable ${payable.toFixed(3)}. Current total ${total.toFixed(3)}.`);
      return;
    }
    if (!window.confirm(`Update payment type for Bill ${data.billNo}?`)) return;
    setBusy(true);
    try {
      await adminApi.updatePayment({ billId: data.billId, cash: cashN, bank: bankN, bankMode: Number(bankMode) });
      toast.success('Payment type updated');
      setData(null);
      setBillNo('');
    } catch (err) {
      toast.error(adminError(err, 'Failed to update payment'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-exchange-alt" /> Change Payment Type</h2>
      <div className="mst-card usr-narrow">
        <div className="mst-card-h">Enter Bill No</div>
        <div className="mst-card-b mst-form" style={{ gridTemplateColumns: '1fr auto' }}>
          <div className="mst-fg">
            <label>Bill Number</label>
            <input className="mst-inp" value={billNo} placeholder="e.g. 26-52" onChange={(e) => setBillNo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
          </div>
          <div className="mst-actions" style={{ alignItems: 'end' }}>
            <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={search}>Search</button>
          </div>
        </div>
      </div>
      {data && (
        <div className="mst-card usr-narrow" style={{ marginTop: 12 }}>
          <div className="mst-card-h">Bill Details — {data.billNo}</div>
          <div className="mst-card-b mst-form one-col">
            <table className="mst-table">
              <tbody>
                <tr><th>Bill No</th><td>{data.billNo}</td><th>Date</th><td>{data.date}</td></tr>
                <tr><th>Customer</th><td>{data.cusName || '—'}</td><th>Payable</th><td>{Number(data.payable).toFixed(3)}</td></tr>
              </tbody>
            </table>
            <div className="mst-fg"><label>Cash Amount</label><input className="mst-inp" type="number" min="0" step="0.001" value={cash} onChange={(e) => setCash(e.target.value)} /></div>
            <div className="mst-fg"><label>Bank Amount</label><input className="mst-inp" type="number" min="0" step="0.001" value={bank} onChange={(e) => setBank(e.target.value)} /></div>
            {bankN > 0 && (
              <div className="mst-fg">
                <label>Bank / Payment Mode</label>
                <select className="mst-sel" value={bankMode} onChange={(e) => setBankMode(e.target.value)}>
                  <option value="1">UPI</option>
                  <option value="2">Debit Card</option>
                  <option value="3">Credit Card</option>
                  <option value="4">Net Banking</option>
                  <option value="5">Wallet</option>
                </select>
              </div>
            )}
            <div className="mst-note">{modeText}</div>
            <div className="mst-actions">
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setData(null)}>Cancel</button>
              <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={save}>Update Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangePaymentTypePage;
