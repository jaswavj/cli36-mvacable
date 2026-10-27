import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  salonExpenseApi,
  salonExpenseData,
  salonExpenseError,
  type SalonExpenseReport,
  type SalonExpenseRow,
} from '../../../api/salon-expense/salon-expense-api-service';
import { usersApi, usersData } from '../../../api/users/users-api-service';
import '../master/Master.css';
import '../customer/Customer.css';
import '../quick-bill/QuickBill.css';

type Tab = 'entry' | 'report';
type UserOpt = { id: number; name?: string; userName?: string; fullName?: string };

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);
const userLabel = (u: UserOpt) => u.name || u.fullName || u.userName || `User ${u.id}`;

const SalonExpensePage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('entry');
  const [amount, setAmount] = useState('');
  const [expenseFor, setExpenseFor] = useState('');
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [data, setData] = useState<SalonExpenseReport | null>(null);
  const [editing, setEditing] = useState<SalonExpenseRow | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editFor, setEditFor] = useState('');

  const search = useCallback(async (fromDate = from, toDate = to, nextUser = userId) => {
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
      setData(
        salonExpenseData<SalonExpenseReport>(
          await salonExpenseApi.report(fromDate, toDate, undefined, nextUser ? Number(nextUser) : undefined)
        )
      );
    } catch (err) {
      toast.error(salonExpenseError(err, 'Could not load expense report'));
    } finally {
      setBusy(false);
    }
  }, [from, to, userId]);

  useEffect(() => {
    usersApi
      .list()
      .then((res) => setUsers(usersData<UserOpt[]>(res) || []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (tab === 'report') search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const openEdit = (row: SalonExpenseRow) => {
    setEditing(row);
    setEditAmount(String(row.amount ?? ''));
    setEditFor(row.expenseFor || '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    const value = parseFloat(editAmount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.warning('Enter a valid amount');
      return;
    }
    if (!editFor.trim()) {
      toast.warning('Enter expense for');
      return;
    }
    setBusy(true);
    try {
      await salonExpenseApi.update(editing.id, { amount: value, expenseFor: editFor.trim() });
      toast.success('Expense updated');
      setEditing(null);
      await search();
    } catch (err) {
      toast.error(salonExpenseError(err, 'Could not update expense'));
    } finally {
      setBusy(false);
    }
  };

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
              <div className="mst-fg">
                <label>User</label>
                <select className="mst-sel" value={userId} onChange={(e) => setUserId(e.target.value)}>
                  <option value="">All Users</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {userLabel(u)}
                    </option>
                  ))}
                </select>
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
                          <th style={{ width: 52 }}>Edit</th>
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
                            <td>
                              <button className="mst-icon-btn" type="button" title="Edit" onClick={() => openEdit(row)}>
                                <i className="fas fa-edit" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th colSpan={4}>Total</th>
                          <th className="num">{n(data.grandTotal)}</th>
                          <th colSpan={2} />
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

      {editing && (
        <div className="cust-modal" onClick={() => !busy && setEditing(null)}>
          <div className="cust-modal-box narrow" onClick={(e) => e.stopPropagation()}>
            <div className="cust-modal-h">
              <div>
                <h3>Edit Expense</h3>
                <p>
                  {editing.expenseDate} {editing.expenseTime} · {editing.userName || '—'}
                </p>
              </div>
              <button className="mst-icon-btn" type="button" onClick={() => setEditing(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="cust-modal-b">
              <div className="mst-fg">
                <label>Amount</label>
                <input
                  className="mst-inp"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
              <div className="mst-fg span-2">
                <label>Expense For</label>
                <textarea
                  className="mst-inp"
                  rows={3}
                  value={editFor}
                  onChange={(e) => setEditFor(e.target.value)}
                  placeholder="Tea, rent, supplies…"
                />
              </div>
            </div>
            <div className="cust-modal-f">
              <button className="mst-btn mst-btn-outline" type="button" disabled={busy} onClick={() => setEditing(null)}>
                Close
              </button>
              <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={saveEdit}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalonExpensePage;
