import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { accountApi, accountData, accountError } from '../../../api/account-reports/account-report-api-service';
import '../master/Master.css';
import { n2, today } from './reportHelpers';
import { useBillDetail } from './BillDetailModal';

type BookRow = { category: string; inAmt: number; outAmt: number };
type DetailRow = { category: string; cash: number; credit: number; bank: number; total: number };
type SaleRow = { date: string; billNo: string; status: string; saleType: string; customer: string; payable: number };
type ObRow = { id: number; balanceDate: string; amount: number; notes: string; userName: string; payMode: number; cashPaid: number; bankPaid: number };
type BookData = {
  cashOpening: number; bankOpening: number; cashBook: BookRow[]; bankBook: BookRow[];
  detail: DetailRow[]; sales: SaleRow[];
};

const n2Amt = (v: number) => (v ? n2(v) : '');
const balCls = (v: number) => (v >= 0 ? { color: '#166534', fontWeight: 700 } : { color: '#991b1b', fontWeight: 700 });

const emptyOb = () => ({
  balanceDate: today(),
  amount: '',
  notes: '',
  payMode: '1',
  payType: '0',
  cashPaid: '0.00',
  bankPaid: '0.00',
});

const DayBookPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [data, setData] = useState<BookData | null>(null);
  const [showOb, setShowOb] = useState(false);
  const [ob, setOb] = useState(emptyOb);
  const [obRows, setObRows] = useState<ObRow[]>([]);
  const [busy, setBusy] = useState(false);
  const { openBill, billModal } = useBillDetail();

  const loadOb = () => {
    accountApi.openingBalances().then((res) => setObRows(accountData<ObRow[]>(res) || [])).catch(() => undefined);
  };

  useEffect(() => {
    if (showOb) loadOb();
  }, [showOb]);

  const search = async () => {
    try {
      setData(accountData<BookData>(await accountApi.dayBook(from, to)));
    } catch (err) {
      toast.error(accountError(err, 'Could not load day book'));
    }
  };

  const applyMode = (mode: string, amt = parseFloat(ob.amount) || 0) => {
    if (mode === '1') setOb((f) => ({ ...f, payMode: mode, payType: '0', cashPaid: n2(amt), bankPaid: '0.00' }));
    else if (mode === '2') setOb((f) => ({ ...f, payMode: mode, payType: f.payType === '0' ? '1' : f.payType, cashPaid: '0.00', bankPaid: n2(amt) }));
    else setOb((f) => ({ ...f, payMode: mode, payType: f.payType === '0' ? '1' : f.payType, cashPaid: n2(amt), bankPaid: '0.00' }));
  };

  const saveOb = async () => {
    const amount = parseFloat(ob.amount) || 0;
    const cashPaid = parseFloat(ob.cashPaid) || 0;
    const bankPaid = parseFloat(ob.bankPaid) || 0;
    if (!ob.balanceDate || amount <= 0) {
      toast.error('Please enter date and amount.');
      return;
    }
    if (Math.abs(cashPaid + bankPaid - amount) > 0.01) {
      toast.error('Cash + Bank must equal the amount.');
      return;
    }
    setBusy(true);
    try {
      accountData(await accountApi.saveOpeningBalance({
        balanceDate: ob.balanceDate,
        amount,
        notes: ob.notes,
        payMode: Number(ob.payMode),
        payType: Number(ob.payType),
        cashPaid,
        bankPaid,
      }));
      toast.success('Opening balance saved');
      setOb(emptyOb());
      loadOb();
    } catch (err) {
      toast.error(accountError(err, 'Could not save opening balance'));
    } finally {
      setBusy(false);
    }
  };

  const renderBook = (title: string, opening: number, rows: BookRow[], inLabel: string, outLabel: string) => {
    let bal = opening;
    let totIn = 0;
    let totOut = 0;
    return (
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-h">{title}</div>
        <div className="mst-table-wrap">
          <table className="mst-table">
            <thead><tr><th>#</th><th>Description</th><th className="num">{inLabel}</th><th className="num">{outLabel}</th><th className="num">Balance</th></tr></thead>
            <tbody>
              <tr>
                <td />
                <td><strong>Opening Balance (B/F)</strong></td>
                <td /><td />
                <td className="num" style={balCls(opening)}>{n2(opening)}</td>
              </tr>
              {rows.map((row, i) => {
                bal += row.inAmt - row.outAmt;
                totIn += row.inAmt;
                totOut += row.outAmt;
                return (
                  <tr key={`${row.category}-${i}`}>
                    <td>{i + 1}</td>
                    <td>{row.category}</td>
                    <td className="num">{n2Amt(row.inAmt)}</td>
                    <td className="num">{n2Amt(row.outAmt)}</td>
                    <td className="num" style={balCls(bal)}>{n2(bal)}</td>
                  </tr>
                );
              })}
              <tr>
                <td />
                <td><strong>Closing Balance</strong></td>
                <td className="num"><strong>{n2(totIn)}</strong></td>
                <td className="num"><strong>{n2(totOut)}</strong></td>
                <td className="num" style={balCls(bal)}><strong>{n2(bal)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-book" /> Day Book</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate Day Book</button>
            <button className="mst-btn mst-btn-outline" type="button" onClick={() => setShowOb((v) => !v)}>Opening Balance</button>
          </div>
        </div>
      </div>
      {showOb && (
        <div className="mst-card" style={{ marginBottom: 12 }}>
          <div className="mst-card-h">Add Opening Balance</div>
          <div className="mst-card-b mst-form">
            <div className="mst-fg"><label>Date</label><input className="mst-inp" type="date" value={ob.balanceDate} onChange={(e) => setOb((f) => ({ ...f, balanceDate: e.target.value }))} /></div>
            <div className="mst-fg">
              <label>Amount</label>
              <input className="mst-inp" type="number" value={ob.amount} onChange={(e) => {
                const amt = parseFloat(e.target.value) || 0;
                setOb((f) => {
                  if (f.payMode === '1') return { ...f, amount: e.target.value, cashPaid: n2(amt), bankPaid: '0.00' };
                  if (f.payMode === '2') return { ...f, amount: e.target.value, cashPaid: '0.00', bankPaid: n2(amt) };
                  return { ...f, amount: e.target.value, cashPaid: n2(amt), bankPaid: '0.00' };
                });
              }} />
            </div>
            <div className="mst-fg"><label>Notes</label><input className="mst-inp" value={ob.notes} onChange={(e) => setOb((f) => ({ ...f, notes: e.target.value }))} /></div>
            <div className="mst-fg">
              <label>Pay Mode</label>
              <select className="mst-sel" value={ob.payMode} onChange={(e) => applyMode(e.target.value)}>
                <option value="1">Cash</option>
                <option value="2">Bank</option>
                <option value="3">Mixed</option>
              </select>
            </div>
            <div className="mst-fg">
              <label>Pay Type</label>
              <select className="mst-sel" value={ob.payType} disabled={ob.payMode === '1'} onChange={(e) => setOb((f) => ({ ...f, payType: e.target.value }))}>
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
              <input className="mst-inp" type="number" disabled={ob.payMode === '2'} value={ob.cashPaid} onChange={(e) => {
                const cash = parseFloat(e.target.value) || 0;
                const amt = parseFloat(ob.amount) || 0;
                setOb((f) => ({ ...f, cashPaid: e.target.value, bankPaid: ob.payMode === '3' ? n2(Math.max(0, amt - cash)) : f.bankPaid }));
              }} />
            </div>
            <div className="mst-fg">
              <label>Bank Paid</label>
              <input className="mst-inp" type="number" disabled={ob.payMode === '1'} value={ob.bankPaid} onChange={(e) => {
                const bank = parseFloat(e.target.value) || 0;
                const amt = parseFloat(ob.amount) || 0;
                setOb((f) => ({ ...f, bankPaid: e.target.value, cashPaid: ob.payMode === '3' ? n2(Math.max(0, amt - bank)) : f.cashPaid }));
              }} />
            </div>
            <div className="mst-actions">
              <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={saveOb}>Save</button>
            </div>
          </div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead><tr><th>Date</th><th className="num">Amount</th><th>Cash / Bank</th><th>Notes</th><th>User</th></tr></thead>
              <tbody>
                {obRows.length === 0 && <tr><td colSpan={5} className="mst-empty">No opening balance entries yet.</td></tr>}
                {obRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.balanceDate}</td>
                    <td className="num">{n2(row.amount)}</td>
                    <td>{row.payMode === 2 ? `Bank ₹${n2(row.bankPaid || row.amount)}` : row.payMode === 3 ? `Cash ₹${n2(row.cashPaid)} / Bank ₹${n2(row.bankPaid)}` : `Cash ₹${n2(row.cashPaid || row.amount)}`}</td>
                    <td>{row.notes || '-'}</td>
                    <td>{row.userName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data && (
        <>
          {renderBook('1. Cash Book', data.cashOpening, data.cashBook, 'Cash In', 'Cash Out')}
          {renderBook('2. Bank Book', data.bankOpening, data.bankBook, 'Bank In', 'Bank Out')}
          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-h">3. Day Book</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead><tr><th>#</th><th>Description</th><th className="num">Cash</th><th className="num">Credit</th><th className="num">Bank</th><th className="num">Total</th></tr></thead>
                <tbody>
                  <tr>
                    <td />
                    <td><strong>Opening Balance (B/F)</strong></td>
                    <td className="num" style={balCls(data.cashOpening)}>{n2(data.cashOpening)}</td>
                    <td />
                    <td />
                    <td className="num" style={balCls(data.cashOpening)}>{n2(data.cashOpening)}</td>
                  </tr>
                  {data.detail.map((row, i) => (
                    <tr key={`${row.category}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{row.category}</td>
                      <td className="num">{row.cash ? n2(row.cash) : ''}</td>
                      <td className="num">{row.credit ? n2(row.credit) : ''}</td>
                      <td className="num">{row.bank ? n2(row.bank) : ''}</td>
                      <td className="num"><strong>{n2(row.total)}</strong></td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2}><strong>Grand Total</strong></td>
                    <td className="num"><strong>{n2(data.detail.reduce((s, r) => s + r.cash, 0))}</strong></td>
                    <td className="num"><strong>{n2(data.detail.reduce((s, r) => s + r.credit, 0))}</strong></td>
                    <td className="num"><strong>{n2(data.detail.reduce((s, r) => s + r.bank, 0))}</strong></td>
                    <td className="num"><strong>{n2(data.detail.reduce((s, r) => s + r.total, 0))}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">4. Sales Details</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead><tr><th>#</th><th>Date</th><th>Bill No</th><th>Status</th><th>Type</th><th>Customer</th><th className="num">Payable</th></tr></thead>
                <tbody>
                  {data.sales.length === 0 && <tr><td colSpan={7} className="mst-empty">No sales.</td></tr>}
                  {data.sales.map((row, i) => (
                    <tr
                      key={`${row.billNo}-${i}`}
                      className={row.status === 'Cancelled' ? undefined : 'mst-click-row'}
                      onClick={() => row.status !== 'Cancelled' && openBill(row.billNo)}
                    >
                      <td>{i + 1}</td>
                      <td>{row.date}</td>
                      <td>{row.billNo}</td>
                      <td style={{ color: row.status === 'Cancelled' ? '#991b1b' : '#166534', fontWeight: row.status === 'Cancelled' ? 700 : 400 }}>{row.status}</td>
                      <td>{row.saleType}</td>
                      <td>{row.customer}</td>
                      <td className="num">{n2(row.payable)}</td>
                    </tr>
                  ))}
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

export default DayBookPage;
