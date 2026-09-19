import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { expenseApi, expenseData, expenseError } from '../../../api/expense/expense-api-service';
import '../master/Master.css';

type TypeRow = { id: number; name: string };

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const n2 = (v: number) => (Number.isFinite(v) ? v.toFixed(2) : '0.00');

const emptyForm = () => ({
  expenseType: '',
  amount: '',
  content: '',
  description: '',
  expenseDate: today(),
  expenseTime: nowTime(),
  payMode: '1',
  payType: '0',
  cashPaid: '0.00',
  bankPaid: '0.00',
  balance: '0.00',
});

const ExpenseEntryPage: React.FC = () => {
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    expenseApi.types()
      .then((res) => setTypes(expenseData<TypeRow[]>(res) || []))
      .catch((err) => toast.error(expenseError(err, 'Could not load expense types')));
  }, []);

  const amount = parseFloat(form.amount) || 0;
  const cash = parseFloat(form.cashPaid) || 0;
  const bank = parseFloat(form.bankPaid) || 0;
  const bal = parseFloat(form.balance) || 0;
  const cashOnly = form.payMode === '1';
  const bankOnly = form.payMode === '2';

  const applyMode = (mode: string, amt = amount) => {
    if (mode === '1') {
      setForm((f) => ({ ...f, payMode: mode, payType: '0', cashPaid: n2(amt), bankPaid: '0.00', balance: '0.00' }));
    } else if (mode === '2') {
      setForm((f) => ({ ...f, payMode: mode, payType: f.payType === '0' ? '1' : f.payType, cashPaid: '0.00', bankPaid: n2(amt), balance: '0.00' }));
    } else {
      setForm((f) => ({ ...f, payMode: mode, payType: f.payType === '0' ? '1' : f.payType, cashPaid: n2(amt), bankPaid: '0.00', balance: '0.00' }));
    }
  };

  const onAmount = (value: string) => {
    const amt = parseFloat(value) || 0;
    setForm((f) => {
      if (f.payMode === '1') return { ...f, amount: value, cashPaid: n2(amt), bankPaid: '0.00', balance: '0.00' };
      if (f.payMode === '2') return { ...f, amount: value, cashPaid: '0.00', bankPaid: n2(amt), balance: '0.00' };
      return { ...f, amount: value, cashPaid: n2(amt), bankPaid: '0.00', balance: '0.00' };
    });
  };

  const onCash = (value: string) => {
    const paid = parseFloat(value) || 0;
    if (cashOnly) {
      setForm((f) => ({ ...f, cashPaid: value, balance: n2(Math.max(0, amount - paid)) }));
    } else {
      const nextBal = parseFloat(form.balance) || 0;
      setForm((f) => ({ ...f, cashPaid: value, bankPaid: n2(Math.max(0, amount - paid - nextBal)) }));
    }
  };

  const onBank = (value: string) => {
    const paid = parseFloat(value) || 0;
    if (bankOnly) {
      setForm((f) => ({ ...f, bankPaid: value, balance: n2(Math.max(0, amount - paid)) }));
    } else {
      const nextBal = parseFloat(form.balance) || 0;
      setForm((f) => ({ ...f, bankPaid: value, cashPaid: n2(Math.max(0, amount - paid - nextBal)) }));
    }
  };

  const onBalance = (value: string) => {
    const nextBal = parseFloat(value) || 0;
    const nextBank = parseFloat(form.bankPaid) || 0;
    setForm((f) => ({ ...f, balance: value, cashPaid: n2(Math.max(0, amount - nextBank - nextBal)) }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.expenseType) {
      toast.warning('Please select an expense type');
      return;
    }
    if (amount <= 0) {
      toast.warning('Please enter a valid amount');
      return;
    }
    if (!form.content.trim()) {
      toast.warning('Please enter content');
      return;
    }
    if (!form.expenseDate) {
      toast.warning('Please select a date');
      return;
    }
    if (!form.expenseTime) {
      toast.warning('Please select a time');
      return;
    }
    if (Math.abs(cash + bank + bal - amount) > 0.01) {
      toast.error('Cash + Bank + Balance must equal the expense amount.');
      return;
    }
    if (cashOnly && cash <= 0 && bal <= 0) {
      toast.warning('Please enter cash paid amount.');
      return;
    }
    if (bankOnly && bank <= 0 && bal <= 0) {
      toast.warning('Please enter bank paid amount.');
      return;
    }
    setBusy(true);
    try {
      await expenseApi.saveEntry({
        expenseType: Number(form.expenseType),
        content: form.content.trim(),
        description: form.description.trim(),
        amount,
        expenseDate: form.expenseDate,
        expenseTime: form.expenseTime,
        payMode: Number(form.payMode),
        payType: cashOnly ? 0 : Number(form.payType),
        cashPaid: cashOnly ? cash : cash,
        bankPaid: cashOnly ? 0 : bank,
        balance: bal,
      });
      toast.success('Expense entry added successfully!');
      setForm(emptyForm());
    } catch (err) {
      toast.error(expenseError(err, 'Could not save expense'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-receipt" /> Expense Entry</h2>
      <div className="mst-card" style={{ maxWidth: 900 }}>
        <div className="mst-card-h">Add Expense Entry</div>
        <form className="mst-card-b mst-form" onSubmit={onSubmit}>
          <div className="mst-fg">
            <label>Expense Type <span className="req">*</span></label>
            <select className="mst-sel" value={form.expenseType} onChange={(e) => setForm({ ...form, expenseType: e.target.value })}>
              <option value="">-- Select Expense Type --</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="mst-fg">
            <label>Amount <span className="req">*</span></label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => onAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <label>Content <span className="req">*</span></label>
            <input className="mst-inp" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Enter content" />
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea className="mst-area" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Type anything you want to store here" />
          </div>
          <div className="mst-fg">
            <label>Date <span className="req">*</span></label>
            <input className="mst-inp" type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>Time <span className="req">*</span></label>
            <input className="mst-inp" type="time" value={form.expenseTime} onChange={(e) => setForm({ ...form, expenseTime: e.target.value })} />
          </div>
          <div className="mst-fg" style={{ gridColumn: '1 / -1' }}>
            <div className="mst-note" style={{ marginBottom: 0 }}><i className="fas fa-money-bill-wave" /> Payment Details</div>
          </div>
          <div className="mst-fg">
            <label>Pay Mode</label>
            <select className="mst-sel" value={form.payMode} onChange={(e) => applyMode(e.target.value)}>
              <option value="1">Cash</option>
              <option value="2">Bank</option>
              <option value="3">Mixed</option>
            </select>
          </div>
          <div className="mst-fg">
            <label>Pay Type</label>
            <select className="mst-sel" value={form.payType} disabled={cashOnly} onChange={(e) => setForm({ ...form, payType: e.target.value })}>
              <option value="0">—</option>
              <option value="1">UPI</option>
              <option value="2">Debit Card</option>
              <option value="3">Credit Card</option>
              <option value="4">Net Banking</option>
              <option value="5">Wallet</option>
            </select>
          </div>
          <div className="mst-fg">
            <label>Cash Paid</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.cashPaid} disabled={bankOnly} onChange={(e) => onCash(e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>Bank Paid</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.bankPaid} disabled={cashOnly} onChange={(e) => onBank(e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>Balance</label>
            <input className="mst-inp" type="number" min="0" step="0.01" value={form.balance} disabled={form.payMode !== '3'} onChange={(e) => onBalance(e.target.value)} />
          </div>
          <div className="mst-actions" style={{ gridColumn: '1 / -1' }}>
            <button className="mst-btn mst-btn-outline" type="button" onClick={() => setForm(emptyForm())}>Reset</button>
            <button className="mst-btn mst-btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Expense'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseEntryPage;
