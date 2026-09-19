import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
  collectionApi,
  collectionData,
  collectionError,
  type AccountExpense,
  type AccountReport,
  type CollectionReport,
  type CollectionReportRow,
} from '../../../api/collection/collection-api-service';
import { usersApi, usersData } from '../../../api/users/users-api-service';
import '../master/Master.css';
import '../credit/Credit.css';
import '../customer/Customer.css';
import './Collection.css';

type UserOpt = { id: number; name?: string; userName?: string; fullName?: string };
type ReportTab = 'collection' | 'account';

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const n = (v?: number) => Number(v || 0).toFixed(0);
const payLabel = (mode?: string) => (mode === 'upi' ? 'UPI' : mode === 'cash' ? 'Cash' : mode || '—');
const typeLabel = (type?: string) => (type === 'wifi' ? 'WiFi' : type === 'cable' ? 'Cable' : type || '—');
const userLabel = (u: UserOpt) => u.name || u.fullName || u.userName || `User ${u.id}`;

const CollectionReportPage: React.FC = () => {
  const [tab, setTab] = useState<ReportTab>('collection');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [userId, setUserId] = useState('');
  const [payMode, setPayMode] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [data, setData] = useState<CollectionReport | null>(null);
  const [account, setAccount] = useState<AccountReport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    usersApi
      .list()
      .then((res) => setUsers(usersData<UserOpt[]>(res) || []))
      .catch(() => undefined);
  }, []);

  const searchCollection = async () => {
    if (!from || !to) {
      toast.warning('Select from and to date');
      return;
    }
    setBusy(true);
    try {
      setData(
        collectionData<CollectionReport>(
          await collectionApi.report(
            from,
            to,
            userId ? Number(userId) : undefined,
            payMode || undefined,
            customerType || undefined
          )
        )
      );
    } catch (err) {
      toast.error(collectionError(err, 'Could not load collection report'));
    } finally {
      setBusy(false);
    }
  };

  const searchAccount = async () => {
    if (!from || !to) {
      toast.warning('Select from and to date');
      return;
    }
    if (to < from) {
      toast.warning('To date cannot be before from date');
      return;
    }
    setBusy(true);
    try {
      setAccount(collectionData<AccountReport>(await collectionApi.account(from, to)));
    } catch (err) {
      toast.error(collectionError(err, 'Could not load account report'));
    } finally {
      setBusy(false);
    }
  };

  const search = () => (tab === 'account' ? searchAccount() : searchCollection());

  const rows: CollectionReportRow[] = data?.rows || [];
  const expenses: AccountExpense[] = account?.expenses || [];
  const finalAmt = Number(account?.finalAmount || 0);

  return (
    <div className="mst-page col-report">
      <h2 className="mst-title">
        <i className="fas fa-chart-bar" /> Collection Report
      </h2>

      <div className="cust-tabs">
        <button type="button" className={`cust-tab${tab === 'collection' ? ' on' : ''}`} onClick={() => setTab('collection')}>
          Collection Report
        </button>
        <button type="button" className={`cust-tab${tab === 'account' ? ' on' : ''}`} onClick={() => setTab('account')}>
          Account Report
        </button>
      </div>

      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className={`mst-card-b mst-form${tab === 'account' ? ' col-acc-form' : ''}`}>
          <div className="mst-fg">
            <label>From Date</label>
            <input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>To Date</label>
            <input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {tab === 'collection' && (
            <>
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
              <div className="mst-fg">
                <label>Payment</label>
                <select className="mst-sel" value={payMode} onChange={(e) => setPayMode(e.target.value)}>
                  <option value="">Cash / UPI</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
              <div className="mst-fg">
                <label>Type</label>
                <select className="mst-sel" value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
                  <option value="">Cable / WiFi</option>
                  <option value="cable">Cable</option>
                  <option value="wifi">WiFi</option>
                </select>
              </div>
            </>
          )}
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={search}>
              {busy ? 'Loading…' : 'Generate'}
            </button>
          </div>
        </div>
      </div>

      {tab === 'collection' && data && (
        <>
          <div className="col-rep-stats">
            <div className="mst-card crd-stat col-rep-stat">
              <div className="crd-stat-l">Entries</div>
              <div className="crd-stat-v">{data.count || 0}</div>
            </div>
            <div className="mst-card crd-stat col-rep-stat">
              <div className="crd-stat-l">Total</div>
              <div className="crd-stat-v">₹ {n(data.totalAmount)}</div>
            </div>
            <div className="mst-card crd-stat col-rep-stat">
              <div className="crd-stat-l">Cash</div>
              <div className="crd-stat-v ok">₹ {n(data.cashTotal)}</div>
            </div>
            <div className="mst-card crd-stat col-rep-stat">
              <div className="crd-stat-l">UPI</div>
              <div className="crd-stat-v">₹ {n(data.upiTotal)}</div>
            </div>
            <div className="mst-card crd-stat col-rep-stat">
              <div className="crd-stat-l">Cable</div>
              <div className="crd-stat-v">₹ {n(data.cableTotal)}</div>
            </div>
            <div className="mst-card crd-stat col-rep-stat">
              <div className="crd-stat-l">WiFi</div>
              <div className="crd-stat-v">₹ {n(data.wifiTotal)}</div>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">Collection Details</div>
            <div className="col-rep-list">
              {rows.length === 0 && <div className="mst-empty">No collections found for the selected filters.</div>}
              {rows.map((row) => (
                <article key={row.id} className="col-rep-item">
                  <div className="col-rep-item-h">
                    <strong>{row.customerName || row.customerId || '—'}</strong>
                    <span className="col-rep-amt">₹ {n(row.amount)}</span>
                  </div>
                  <div className="col-rep-item-m">
                    <strong>{row.customerId}</strong>
                    <span className={`cust-type-pill ${row.customerType === 'wifi' ? 'wifi' : 'cable'}`}>
                      {typeLabel(row.customerType)}
                    </span>
                    <span>{payLabel(row.payMode)}</span>
                    <span>{row.monthLabel || '—'}</span>
                  </div>
                  <div className="col-rep-item-f">
                    <span>
                      {row.paidDate || '—'} {row.paidTime || ''}
                    </span>
                    <span>{row.collectedBy || '—'}</span>
                  </div>
                </article>
              ))}
              {rows.length > 0 && (
                <div className="col-rep-item total">
                  <span>Grand Total</span>
                  <span className="col-rep-amt">₹ {n(data.totalAmount)}</span>
                </div>
              )}
            </div>
            <div className="mst-table-wrap col-rep-table">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Customer ID</th>
                    <th>Name</th>
                    <th>Month</th>
                    <th>Mode</th>
                    <th className="num">Amount</th>
                    <th>Collected By</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="mst-empty">
                        No collections found for the selected filters.
                      </td>
                    </tr>
                  )}
                  {rows.map((row, i) => (
                    <tr key={row.id}>
                      <td>{i + 1}</td>
                      <td>{row.paidDate || '—'}</td>
                      <td>{row.paidTime || '—'}</td>
                      <td>
                        <span className={`cust-type-pill ${row.customerType === 'wifi' ? 'wifi' : 'cable'}`}>
                          {typeLabel(row.customerType)}
                        </span>
                      </td>
                      <td>
                        <strong>{row.customerId}</strong>
                      </td>
                      <td>{row.customerName || '—'}</td>
                      <td>{row.monthLabel || '—'}</td>
                      <td>{payLabel(row.payMode)}</td>
                      <td className="num">
                        <strong>₹ {n(row.amount)}</strong>
                      </td>
                      <td>{row.collectedBy || '—'}</td>
                    </tr>
                  ))}
                  {rows.length > 0 && (
                    <tr>
                      <td colSpan={8}>
                        <strong>Grand Total</strong>
                      </td>
                      <td className="num">
                        <strong>₹ {n(data.totalAmount)}</strong>
                      </td>
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'account' && account && (
        <>
          <div className="col-acc-stats">
            <div className="mst-card crd-stat col-rep-stat">
              <div className="crd-stat-l">Collection</div>
              <div className="crd-stat-v ok">₹ {n(account.collectionTotal)}</div>
              <div className="col-acc-note">{account.collectionCount || 0} entries</div>
            </div>
            <div className="mst-card crd-stat col-rep-stat">
              <div className="crd-stat-l">Cash</div>
              <div className="crd-stat-v ok">₹ {n(account.cashTotal)}</div>
            </div>
            <div className="mst-card crd-stat col-rep-stat">
              <div className="crd-stat-l">UPI</div>
              <div className="crd-stat-v">₹ {n(account.upiTotal)}</div>
            </div>
            <div className="mst-card crd-stat col-rep-stat">
              <div className="crd-stat-l">Expense</div>
              <div className="crd-stat-v due">₹ {n(account.expenseTotal)}</div>
              <div className="col-acc-note">{account.expenseCount || 0} entries</div>
            </div>
            <div className="mst-card crd-stat col-rep-stat">
              <div className="crd-stat-l">Final Amount</div>
              <div className={`crd-stat-v ${finalAmt >= 0 ? 'ok' : 'due'}`}>₹ {n(account.finalAmount)}</div>
              <div className="col-acc-note">Collection − Expense</div>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">Expense Details</div>
            <div className="col-rep-list">
              {expenses.length === 0 && <div className="mst-empty">No expense in this date range.</div>}
              {expenses.map((row) => (
                <article key={row.id} className="col-rep-item">
                  <div className="col-rep-item-h">
                    <strong>{row.expenseFor || '—'}</strong>
                    <span className="col-rep-amt">₹ {n(row.amount)}</span>
                  </div>
                  <div className="col-rep-item-f">
                    <span>
                      {row.expenseDate || '—'} {row.expenseTime || ''}
                    </span>
                    <span>{row.userName || '—'}</span>
                  </div>
                </article>
              ))}
              {expenses.length > 0 && (
                <div className="col-rep-item total">
                  <span>Expense Total</span>
                  <span className="col-rep-amt">₹ {n(account.expenseTotal)}</span>
                </div>
              )}
            </div>
            <div className="mst-table-wrap col-rep-table">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Expense For</th>
                    <th>User</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="mst-empty">
                        No expense in this date range.
                      </td>
                    </tr>
                  )}
                  {expenses.map((row, i) => (
                    <tr key={row.id}>
                      <td>{i + 1}</td>
                      <td>{row.expenseDate || '—'}</td>
                      <td>{row.expenseTime || '—'}</td>
                      <td>{row.expenseFor || '—'}</td>
                      <td>{row.userName || '—'}</td>
                      <td className="num">
                        <strong>₹ {n(row.amount)}</strong>
                      </td>
                    </tr>
                  ))}
                  {expenses.length > 0 && (
                    <tr>
                      <td colSpan={5}>
                        <strong>Expense Total</strong>
                      </td>
                      <td className="num">
                        <strong>₹ {n(account.expenseTotal)}</strong>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CollectionReportPage;
