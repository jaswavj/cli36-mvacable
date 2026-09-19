import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { creditApi, creditData, creditError } from '../../../api/credit/credit-api-service';
import '../master/Master.css';
import './Credit.css';

export type PartyKind = 'customer' | 'supplier';

type Summary = {
  totals: { dueCount: number; totalDue: number; totalAdvance: number };
  dueList: { id: number; name: string; phone: string; balance: number }[];
};

type SearchHit = { id: number; name: string; phone: string };

type TimelineRow = {
  type: string;
  docNo: string;
  amount: number | null;
  paid: number | null;
  pending: number | null;
  date: string;
  time: string;
  userName: string;
  refId: number;
  notes: string;
};

type Account = {
  id: number;
  name: string;
  phone: string;
  advance: number;
  balance: number;
  count: number;
  timeline: TimelineRow[];
};

const money = (n?: number | null) =>
  n == null || Number.isNaN(n) ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const num = (n?: number | null) =>
  n == null || Number.isNaN(n) ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CreditIndex: React.FC<{ kind: PartyKind }> = ({ kind }) => {
  const navigate = useNavigate();
  const isCustomer = kind === 'customer';
  const [summary, setSummary] = useState<Summary | null>(null);
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SearchHit | null>(null);
  const [dueOpen, setDueOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    try {
      const res = isCustomer ? await creditApi.customerSummary() : await creditApi.supplierSummary();
      setSummary(creditData<Summary>(res));
    } catch (err) {
      toast.error(creditError(err, 'Could not load account totals'));
    }
  };

  useEffect(() => {
    load();
  }, [kind]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const search = (value: string) => {
    setTerm(value);
    setSelected(null);
    if (timer.current) window.clearTimeout(timer.current);
    if (!value.trim()) {
      setHits([]);
      setOpen(false);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        const q = value.trim();
        const res = isCustomer
          ? /^\d+$/.test(q)
            ? await creditApi.searchCustomers(undefined, q)
            : await creditApi.searchCustomers(q)
          : await creditApi.searchSuppliers(q);
        setHits(creditData<SearchHit[]>(res) || []);
        setOpen(true);
      } catch (err) {
        toast.error(creditError(err, 'Search failed'));
      }
    }, 280);
  };

  const openAccount = (id: number) => {
    navigate(isCustomer ? `/app/credit/customer-balance?id=${id}` : `/app/credit/supplier-payment?id=${id}`);
  };

  const totals = summary?.totals;
  const party = isCustomer ? 'Customer' : 'Supplier';

  return (
    <div className="mst-page crd-narrow crd-index">
      <h2 className="mst-title">
        <i className={isCustomer ? 'fas fa-wallet' : 'fas fa-hand-holding-usd'} />
        {isCustomer ? 'Customers Balance' : 'Supplier Payment'}
      </h2>
      <div className="crd-stats">
        <div className="mst-card crd-stat">
          <div className="crd-stat-l">Due {isCustomer ? 'Customers' : 'Suppliers'}</div>
          <div className="crd-stat-v">{totals?.dueCount ?? 0}</div>
        </div>
        <div className="mst-card crd-stat clickable" onClick={() => setDueOpen(true)}>
          <div className="crd-stat-l">Total Due</div>
          <div className={`crd-stat-v ${(totals?.totalDue || 0) > 0 ? 'due' : 'ok'}`}>{money(totals?.totalDue || 0)}</div>
        </div>
        <div className="mst-card crd-stat">
          <div className="crd-stat-l">Total Advance</div>
          <div className="crd-stat-v ok">{money(totals?.totalAdvance || 0)}</div>
        </div>
      </div>
      <div className="mst-card">
        <div className="mst-card-h">
          <span><i className="fas fa-search" /> Search {party}</span>
        </div>
        <div className="mst-card-b">
          <div className="crd-search-wrap" ref={wrapRef}>
            <input
              className="mst-inp"
              placeholder="Type name or phone number..."
              value={term}
              onChange={(e) => search(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selected) openAccount(selected.id);
              }}
            />
            {open && (
              <ul className="crd-dropdown">
                {hits.length === 0 ? (
                  <li className="muted">No {party.toLowerCase()}s found</li>
                ) : (
                  hits.map((h) => (
                    <li
                      key={h.id}
                      onClick={() => {
                        setSelected(h);
                        setTerm(`${h.name}${h.phone && h.phone !== '-' ? `  |  ${h.phone}` : ''}`);
                        setOpen(false);
                      }}
                    >
                      <strong>{h.name}</strong>
                      {h.phone && h.phone !== '-' ? <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>{h.phone}</span> : null}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          {selected && (
            <div className="crd-selected">
              <div>
                <div style={{ fontWeight: 700 }}>{selected.name}</div>
                <div style={{ fontSize: 13, color: '#555' }}>{selected.phone !== '-' ? selected.phone : ''}</div>
              </div>
              <button className="mst-btn mst-btn-green" type="button" onClick={() => openAccount(selected.id)}>
                View Account <i className="fas fa-arrow-right" />
              </button>
            </div>
          )}
        </div>
      </div>

      {dueOpen && (
        <div className="crd-modal" onClick={() => setDueOpen(false)}>
          <div className="crd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="crd-modal-h">
              <div>
                <div style={{ fontWeight: 800 }}>
                  <i className="fas fa-exclamation-triangle" style={{ color: '#dc2626', marginRight: 8 }} />
                  {isCustomer ? 'Customers' : 'Suppliers'} with Due
                </div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                  {summary?.dueList.length || 0} {party.toLowerCase()}{(summary?.dueList.length || 0) !== 1 ? 's' : ''} | Total: {money(totals?.totalDue || 0)}
                </div>
              </div>
              <button className="mst-icon-btn" type="button" onClick={() => setDueOpen(false)}>&times;</button>
            </div>
            <div className="crd-modal-body">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{party}</th>
                    <th>Phone</th>
                    <th className="num">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary?.dueList || []).length === 0 ? (
                    <tr><td colSpan={4} className="mst-empty">No outstanding dues.</td></tr>
                  ) : (
                    summary!.dueList.map((row, i) => (
                      <tr key={row.id} className="crd-due-row" onClick={() => openAccount(row.id)}>
                        <td>{i + 1}</td>
                        <td style={{ fontWeight: 700 }}>{row.name}</td>
                        <td>{row.phone}</td>
                        <td className="num" style={{ color: '#dc2626', fontWeight: 800 }}>{money(row.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CreditAccount: React.FC<{ kind: PartyKind; id: number }> = ({ kind, id }) => {
  const navigate = useNavigate();
  const isCustomer = kind === 'customer';
  const [account, setAccount] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [entryType, setEntryType] = useState('COLLECTION');
  const [amount, setAmount] = useState('');
  const [payMode, setPayMode] = useState('1');
  const [payType, setPayType] = useState('1');
  const [cashPaid, setCashPaid] = useState('');
  const [bankPaid, setBankPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      const res = isCustomer ? await creditApi.customerAccount(id) : await creditApi.supplierAccount(id);
      const data = creditData<Account>(res);
      setAccount(data);
      const canCollect = (data.balance || 0) > 0.005;
      const nextType = canCollect ? 'COLLECTION' : 'ADVANCE';
      setEntryType(nextType);
      resetAmounts(nextType, data.balance || 0);
      setNotes('');
      setFormError('');
    } catch (err) {
      toast.error(creditError(err, 'Could not load account'));
    }
  };

  useEffect(() => {
    load();
  }, [kind, id]);

  const canCollect = (account?.balance || 0) > 0.005;

  const resetAmounts = (type: string, balance: number) => {
    if (type === 'COLLECTION') {
      setAmount(Math.max(0, balance).toFixed(2));
      applyMode('1', Math.max(0, balance));
    } else {
      setAmount('');
      setCashPaid('');
      setBankPaid('');
      setPayMode('1');
    }
  };

  const applyMode = (mode: string, total: number) => {
    setPayMode(mode);
    if (mode === '1') {
      setCashPaid(total.toFixed(2));
      setBankPaid('');
    } else if (mode === '2') {
      setBankPaid(total.toFixed(2));
      setCashPaid('');
    } else {
      setCashPaid(total.toFixed(2));
      setBankPaid('0.00');
    }
  };

  const onTypeChange = (type: string) => {
    if (type === 'COLLECTION' && !canCollect) {
      setEntryType('ADVANCE');
      resetAmounts('ADVANCE', account?.balance || 0);
      return;
    }
    setEntryType(type);
    resetAmounts(type, account?.balance || 0);
    setFormError('');
  };

  const onAmount = (value: string) => {
    setAmount(value);
    applyMode(payMode, parseFloat(value) || 0);
  };

  const remaining = useMemo(() => {
    if (entryType !== 'COLLECTION') return 0;
    const cash = parseFloat(cashPaid) || 0;
    const bank = parseFloat(bankPaid) || 0;
    const paid = payMode === '1' ? cash : payMode === '2' ? bank : cash + bank;
    return Math.max(0, (account?.balance || 0) - paid);
  }, [entryType, cashPaid, bankPaid, payMode, account]);

  const submit = async () => {
    setFormError('');
    const amt = parseFloat(amount) || 0;
    const cash = parseFloat(cashPaid) || 0;
    const bank = parseFloat(bankPaid) || 0;
    if (entryType === 'COLLECTION' && !canCollect) {
      setFormError('No account balance due to collect.');
      return;
    }
    if (amt <= 0) {
      setFormError('Please enter an amount greater than zero.');
      return;
    }
    if (entryType !== 'OLD_DUE') {
      if (payMode === '1' && cash <= 0) {
        setFormError('Please enter cash paid amount.');
        return;
      }
      if (payMode === '2' && bank <= 0) {
        setFormError('Please enter bank paid amount.');
        return;
      }
      if (payMode === '3') {
        if (cash <= 0 && bank <= 0) {
          setFormError('Please enter cash and/or bank amount.');
          return;
        }
        if (Math.abs(cash + bank - amt) > 0.01) {
          setFormError('Cash + Bank must equal the amount.');
          return;
        }
      }
    }
    setBusy(true);
    try {
      const payload = {
        entryType,
        amount: amt,
        cashPaid: entryType === 'OLD_DUE' || payMode === '2' ? 0 : cash,
        bankPaid: entryType === 'OLD_DUE' || payMode === '1' ? 0 : bank,
        payMode: entryType === 'OLD_DUE' ? 1 : Number(payMode),
        payType: Number(payType),
        notes,
      };
      const res = isCustomer
        ? await creditApi.saveCustomerEntry(id, payload)
        : await creditApi.saveSupplierEntry(id, payload);
      const saved = creditData<{ entryType: string; newBalance?: number; newAdvance?: number }>(res);
      if (saved.entryType === 'COLLECTION') {
        toast.success(`Remaining balance: ${money(saved.newBalance)}`);
      } else if (saved.entryType === 'ADVANCE') {
        toast.success(`Total advance: ${money(saved.newAdvance)}`);
      } else {
        toast.success(`Account balance: ${money(saved.newBalance)}`);
      }
      await load();
    } catch (err) {
      setFormError(creditError(err, 'Error saving entry.'));
    } finally {
      setBusy(false);
    }
  };

  if (!account) {
    return <div className="mst-page"><div className="mst-empty">Loading account…</div></div>;
  }

  const amountClass = entryType === 'OLD_DUE' ? 'old' : entryType === 'ADVANCE' ? 'advance' : 'collect';
  const showPay = entryType !== 'OLD_DUE';
  const showCash = showPay && (payMode === '1' || payMode === '3');
  const showBank = showPay && (payMode === '2' || payMode === '3');
  const showPayType = showPay && (payMode === '2' || payMode === '3');

  return (
    <div className="mst-page crd-account">
      <div className="crd-account-head">
        <button
          className="mst-btn mst-btn-outline crd-back"
          type="button"
          onClick={() => navigate(isCustomer ? '/app/credit/customer-balance' : '/app/credit/supplier-payment')}
        >
          <i className="fas fa-arrow-left" /> Back
        </button>
        <div className="crd-account-id">
          <h2 className="mst-title">
            <i className={isCustomer ? 'fas fa-user-circle' : 'fas fa-truck'} />
            {account.name}
          </h2>
          <div className="mst-note">
            {isCustomer ? 'Customer' : 'Supplier'} Account — {account.phone}
          </div>
        </div>
      </div>
      <div className="crd-layout">
        <div className="crd-left">
          <div className="crd-stats">
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">{isCustomer ? 'Total Bills' : 'Total Purchases'}</div>
              <div className="crd-stat-v">{account.count}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Advance</div>
              <div className="crd-stat-v ok">{money(account.advance)}</div>
            </div>
            <div className="mst-card crd-stat">
              <div className="crd-stat-l">Account Balance</div>
              <div className={`crd-stat-v ${account.balance > 0 ? 'due' : 'ok'}`}>{money(account.balance)}</div>
            </div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">Transactions</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Type</th>
                    <th>{isCustomer ? 'Bill No' : 'GRN No'}</th>
                    <th className="num">Payable / Amt</th>
                    <th className="num">Paid</th>
                    <th className="num">Pending</th>
                    <th>Date / Time</th>
                    <th>{isCustomer ? 'Biller' : 'User'}</th>
                  </tr>
                </thead>
                <tbody>
                  {account.timeline.length === 0 ? (
                    <tr><td colSpan={8} className="mst-empty">No transactions found.</td></tr>
                  ) : (
                    account.timeline.map((row, i) => {
                      const type = (row.type || '').toUpperCase();
                      const pending = row.pending || 0;
                      const hasPend = (type === 'BILL' || type === 'PURCHASE') && pending > 0.005;
                      const rowClass =
                        type === 'RETURN' ? 'crd-row-return'
                          : type === 'OLD_DUE' ? 'crd-row-old'
                            : type === 'ADVANCE' ? 'crd-row-adv'
                              : type === 'COLLECTION' ? 'crd-row-col'
                                : hasPend ? 'crd-row-due' : '';
                      const badge =
                        type === 'BILL' ? (hasPend ? 'bill-due' : 'bill')
                          : type === 'PURCHASE' ? (hasPend ? 'purchase-due' : 'purchase')
                            : type === 'RETURN' ? 'return'
                              : type === 'OLD_DUE' ? 'old'
                                : type === 'ADVANCE' ? 'adv' : 'col';
                      const label =
                        type === 'COLLECTION' && !isCustomer ? 'PAYMENT'
                          : type.replace('_', ' ');
                      return (
                        <tr key={`${type}-${i}-${row.date}-${row.time}`} className={rowClass}>
                          <td>{i + 1}</td>
                          <td><span className={`crd-badge ${badge}`}>{label}</span></td>
                          <td>
                            {row.docNo || row.notes
                              ? <span style={{ fontWeight: row.docNo ? 600 : 400, fontSize: row.docNo ? undefined : 11 }}>{row.docNo || row.notes}</span>
                              : <span style={{ opacity: 0.35 }}>—</span>}
                          </td>
                          <td className="num">{num(row.amount)}</td>
                          <td className="num">{num(row.paid)}</td>
                          <td className="num" style={{ color: hasPend || (type === 'OLD_DUE') || pending > 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                            {num(row.pending)}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {row.date}
                            {row.time ? <><br /><span style={{ fontSize: 10, opacity: 0.6 }}>{row.time}</span></> : null}
                          </td>
                          <td>{row.userName}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="crd-right">
          <div className="mst-card">
            <div className="mst-card-h">Account Entry</div>
            <div className="mst-card-b mst-form one-col">
              <div className="mst-fg">
                <label>Entry Type</label>
                <select className="mst-sel" value={entryType} onChange={(e) => onTypeChange(e.target.value)}>
                  <option value="COLLECTION" disabled={!canCollect}>{isCustomer ? 'Collect Payment (Due)' : 'Pay Due'}</option>
                  <option value="ADVANCE">Add Advance</option>
                  <option value="OLD_DUE">Add Old Due (Before System)</option>
                </select>
              </div>
              {!canCollect && (
                <div className="crd-hint">
                  <i className="fas fa-info-circle" /> No account balance due. You cannot collect payment until there is a due balance.
                </div>
              )}
              <div className="mst-fg">
                <label>{entryType === 'OLD_DUE' ? 'Old Due Amount' : entryType === 'ADVANCE' ? 'Advance Amount' : 'Amount to Collect'}</label>
                <input className={`mst-inp crd-amt ${amountClass}`} type="number" min="0" step="0.01" value={amount} onChange={(e) => onAmount(e.target.value)} />
              </div>
              {showPay && (
                <div className="mst-fg">
                  <label>Pay Mode</label>
                  <select className="mst-sel" value={payMode} onChange={(e) => applyMode(e.target.value, parseFloat(amount) || 0)}>
                    <option value="1">Cash</option>
                    <option value="2">Bank</option>
                    <option value="3">Mixed</option>
                  </select>
                </div>
              )}
              {showPayType && (
                <div className="mst-fg">
                  <label>Pay Type</label>
                  <select className="mst-sel" value={payType} onChange={(e) => setPayType(e.target.value)}>
                    <option value="1">UPI</option>
                    <option value="2">Debit Card</option>
                    <option value="3">Credit Card</option>
                    <option value="4">Net Banking</option>
                    <option value="5">Wallet</option>
                  </select>
                </div>
              )}
              {showCash && (
                <div className="mst-fg">
                  <label>Cash Paid</label>
                  <input
                    className="mst-inp"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashPaid}
                    onChange={(e) => {
                      const cash = parseFloat(e.target.value) || 0;
                      setCashPaid(e.target.value);
                      if (payMode === '3') setBankPaid(Math.max(0, (parseFloat(amount) || 0) - cash).toFixed(2));
                    }}
                  />
                </div>
              )}
              {showBank && (
                <div className="mst-fg">
                  <label>Bank Paid</label>
                  <input
                    className="mst-inp"
                    type="number"
                    min="0"
                    step="0.01"
                    value={bankPaid}
                    onChange={(e) => {
                      const bank = parseFloat(e.target.value) || 0;
                      setBankPaid(e.target.value);
                      if (payMode === '3') setCashPaid(Math.max(0, (parseFloat(amount) || 0) - bank).toFixed(2));
                    }}
                  />
                </div>
              )}
              <div className="mst-fg">
                <label>Notes <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <input
                  className="mst-inp"
                  value={notes}
                  placeholder={entryType === 'OLD_DUE' ? 'e.g. Opening balance before go-live' : entryType === 'ADVANCE' ? 'e.g. Advance for future bills' : 'Remark or reference'}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              {entryType === 'COLLECTION' && (
                <div className="mst-fg">
                  <label>Remaining Balance</label>
                  <input className="mst-inp" readOnly value={remaining.toFixed(2)} style={{ fontWeight: 700, color: '#dc2626', background: '#f8fafc' }} />
                </div>
              )}
              <div className="mst-actions">
                <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={submit} style={{ width: '100%' }}>
                  {busy ? 'Saving…' : entryType === 'OLD_DUE' ? 'Save Old Due' : entryType === 'ADVANCE' ? 'Save Advance' : 'Submit Payment'}
                </button>
              </div>
              {formError && <div className="crd-hint" style={{ color: '#dc2626', textAlign: 'center' }}>{formError}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
