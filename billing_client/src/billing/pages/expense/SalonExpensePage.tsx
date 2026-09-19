import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  salonExpenseApi,
  salonExpenseData,
  salonExpenseError,
  type SalonExpenseReport,
} from '../../../api/salon-expense/salon-expense-api-service';
import '../master/Master.css';
import '../quick-bill/QuickBill.css';

type Tab = 'entry' | 'report';

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);

const SalonExpensePage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('entry');
  const [amount, setAmount] = useState('');
  const [expenseFor, setExpenseFor] = useState('');
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<SalonExpenseReport | null>(null);

  const search = useCallback(async (fromDate = from, toDate = to) => {
    if (!fromDate || !toDate) {
      toast.warning('Select from and to date');
      return;
    }
    if (toDate < fromDate) {
      toast.warning('To date cannot be before from date');
      return;
    }
    setBusy(true);
    try {
      setData(salonExpenseData<SalonExpenseReport>(await salonExpenseApi.report(fromDate, toDate)));
    } catch (err) {
      toast.error(salonExpenseError(err, 'Could not load expense report'));
    } finally {
      setBusy(false);
    }
  }, [from, to]);

  useEffect(() => {
    if (tab === 'report') search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.warning('Enter a valid amount');
      return;
    }
    if (!expenseFor.trim()) {
      toast.warning('Enter expense for');
      return;
    }
    setBusy(true);
    try {
      await salonExpenseApi.save({ amount: value, expenseFor: expenseFor.trim() });
      toast.success('Expense saved');
      setAmount('');
      setExpenseFor('');
    } catch (err) {
      toast.error(salonExpenseError(err, 'Could not save expense'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page qb-report-page">
      <h2 className="mst-title">
        <i className="fas fa-money-bill-wave" /> Expense
      </h2>
      <div className="qb-tabs" role="tablist">
        <button type="button" className={tab === 'entry' ? 'on' : ''} onClick={() => setTab('entry')}>
          Expense Entry
        </button>
        <button type="button" className={tab === 'report' ? 'on' : ''} onClick={() => setTab('report')}>
          Expense Report
        </button>
      </div>

      {tab === 'entry' && (
        <div className="qb-page" style={{ padding: 0 }}>
          <form className="qb-card" onSubmit={onSubmit}>
            <header className="qb-head">
              <h2>Expense Entry</h2>
              <p>Enter amount and what the expense is for.</p>
            </header>

            <label className="qb-label" htmlFor="exp-amount">
              Amount
            </label>
            <div className="qb-amount-wrap">
              <input
                id="exp-amount"
                className="qb-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                autoComplete="off"
              />
            </div>

            <label className="qb-label" htmlFor="exp-for">
              Expense For
            </label>
            <input
              id="exp-for"
              className="qb-notes"
              style={{ minHeight: 52, resize: 'none' }}
              value={expenseFor}
              onChange={(e) => setExpenseFor(e.target.value)}
              placeholder="Tea, rent, supplies…"
              autoComplete="off"
            />

            <button className="qb-save" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </form>
        </div>
      )}

      {tab === 'report' && (
        <>
          <div className="mst-card qb-report-filters">
            <div className="mst-card-b mst-form">
              <div className="mst-fg">
                <label>From Date</label>
                <input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="mst-fg">
                <label>To Date</label>
                <input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="mst-actions">
                <button className="mst-btn mst-btn-primary" type="button" onClick={() => search()} disabled={busy}>
                  {busy ? 'Loading…' : 'Show Details'}
                </button>
              </div>
            </div>
          </div>

          {data && (
            <>
              <div className="qb-kpis qb-account-kpis" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="qb-kpi bills">
                  <span className="qb-kpi-ico">
                    <i className="fas fa-receipt" />
                  </span>
                  <div>
                    <div className="qb-kpi-l">Entries</div>
                    <div className="qb-kpi-v">{data.count || 0}</div>
                  </div>
                </div>
                <div className="qb-kpi incentive">
                  <span className="qb-kpi-ico">
                    <i className="fas fa-coins" />
                  </span>
                  <div>
                    <div className="qb-kpi-l">Total</div>
                    <div className="qb-kpi-v">{n(data.grandTotal)}</div>
                  </div>
                </div>
              </div>
              <div className="mst-card">
                <div className="mst-card-h">
                  <span>Expense details</span>
                  <span className="qb-bills-total">Total {n(data.grandTotal)}</span>
                </div>
                {(data.rows || []).length === 0 ? (
                  <div className="mst-empty">No expense found for the selected dates.</div>
                ) : (
                  <div className="mst-table-wrap">
                    <table className="mst-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Date</th>
                          <th>Time</th>
                          <th>Expense For</th>
                          <th className="num">Amount</th>
                          <th>User</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((row, i) => (
                          <tr key={row.id}>
                            <td>{i + 1}</td>
                            <td>{row.expenseDate}</td>
                            <td>{row.expenseTime}</td>
                            <td>{row.expenseFor}</td>
                            <td className="num">{n(row.amount)}</td>
                            <td>{row.userName || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th colSpan={4}>Total</th>
                          <th className="num">{n(data.grandTotal)}</th>
                          <th />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default SalonExpensePage;
