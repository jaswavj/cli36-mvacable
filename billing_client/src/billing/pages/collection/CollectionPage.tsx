import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  collectionApi,
  collectionData,
  collectionError,
  type CollectionLookup,
  type CollectionMonth,
  type CollectionPayment,
  type CollectionReceipt,
  type PayMode,
} from '../../../api/collection/collection-api-service';
import { CollectionA4Receipt } from './CollectionA4Receipt';
import { printOnClientPrinter } from '../../../utils/local-pos-print';
import '../master/Master.css';
import '../customer/Customer.css';
import '../PrintBill.css';
import './Collection.css';

const show = (v?: string) => (v && v.trim() ? v : '—');
const payLabel = (mode?: string) => (mode === 'upi' ? 'UPI' : mode === 'cash' ? 'Cash' : mode || '—');
const monthYearLabel = (row: CollectionPayment) => {
  if (row.month) {
    const date = new Date(`${row.month}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    }
  }
  return row.monthLabel || '—';
};

const pad2 = (n: number) => String(n).padStart(2, '0');
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const last3MonthsFrom = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 2);
  return toIsoDate(d);
};
const todayIso = () => toIsoDate(new Date());
const currentMonthPrefix = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};
const needsRechargeNow = (lookup?: CollectionLookup | null) => {
  if (!lookup?.currentMonth) return true;
  const month = (lookup.currentMonth.month || '').slice(0, 7);
  return month !== currentMonthPrefix() || lookup.currentMonth.recharged !== true;
};

type PendingPay = {
  row: CollectionMonth;
  payMode: PayMode;
  amount: number;
};

const CollectionPage: React.FC = () => {
  const location = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [customerId, setCustomerId] = useState('');
  const [data, setData] = useState<CollectionLookup | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busyMonth, setBusyMonth] = useState('');
  const [pending, setPending] = useState<PendingPay | null>(null);
  const [rechargePrompt, setRechargePrompt] = useState(false);
  const [acceptedRecharge, setAcceptedRecharge] = useState(false);
  const [skipCurrentRecharge, setSkipCurrentRecharge] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [fromDate, setFromDate] = useState(last3MonthsFrom);
  const [toDate, setToDate] = useState(todayIso);
  const [appliedFrom, setAppliedFrom] = useState(last3MonthsFrom);
  const [appliedTo, setAppliedTo] = useState(todayIso);
  const [a4Receipt, setA4Receipt] = useState<CollectionReceipt | null>(null);

  const unpaidRows = (
    lookup?: CollectionLookup | null,
    opts: { includeCurrent?: boolean; includePending?: boolean } = {}
  ): CollectionMonth[] => {
    if (!lookup) return [];
    const canCurrent = Boolean(opts.includeCurrent) || !needsRechargeNow(lookup);
    const canPending = Boolean(opts.includePending) || canCurrent;
    const rows = canPending ? [...(lookup.pendingMonths || [])] : [];
    if (canCurrent && lookup.currentMonth && !lookup.currentMonth.paid) {
      rows.push(lookup.currentMonth);
    }
    return rows;
  };

  const fillAmounts = (
    lookup: CollectionLookup,
    opts: { includeCurrent?: boolean; includePending?: boolean } = {}
  ) => {
    const next: Record<string, string> = {};
    unpaidRows(lookup, opts).forEach((row) => {
      const value = row.balance ?? row.due ?? lookup.lastAmount ?? lookup.customer.monthlyAmount;
      next[row.month] = value ? String(value) : '';
    });
    setAmounts(next);
  };

  const lookup = async (id = customerId) => {
    if (!id.trim()) {
      toast.warning('Enter customer ID');
      return;
    }
    setBusyMonth('lookup');
    try {
      const next = collectionData<CollectionLookup>(await collectionApi.lookup(id.trim()));
      setAcceptedRecharge(false);
      setSkipCurrentRecharge(false);
      const needs = needsRechargeNow(next);
      setRechargePrompt(needs);
      setData(next);
      fillAmounts(next, { includeCurrent: !needs, includePending: !needs });
    } catch (err) {
      setData(null);
      setShowDetails(false);
      setRechargePrompt(false);
      setAcceptedRecharge(false);
      setSkipCurrentRecharge(false);
      setAmounts({});
      toast.error(collectionError(err, 'Customer not found'));
    } finally {
      setBusyMonth('');
      inputRef.current?.select();
    }
  };

  const resetEntry = () => {
    if (busyMonth) return;
    setCustomerId('');
    setData(null);
    setAmounts({});
    setPending(null);
    setRechargePrompt(false);
    setAcceptedRecharge(false);
    setSkipCurrentRecharge(false);
    setShowDetails(false);
    setBusyMonth('');
    inputRef.current?.focus();
  };

  const incomingId = (location.state as { customerId?: string } | null)?.customerId;
  useEffect(() => {
    if (!incomingId?.trim()) return;
    setCustomerId(incomingId);
    void lookup(incomingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingId]);

  const askCollect = (row: CollectionMonth, payMode: PayMode) => {
    const value = Number(amounts[row.month]);
    if (!value || value <= 0) {
      toast.warning(`Enter amount for ${row.label}`);
      return;
    }
    setPending({ row, payMode, amount: value });
  };

  const collect = async () => {
    if (!data || !pending) return;
    const { row, payMode, amount } = pending;
    setBusyMonth(row.month);
    try {
      const next = collectionData<CollectionLookup>(
        await collectionApi.save({
          customerId: data.customer.customerId,
          items: [{ month: row.month, amount, payMode }],
        })
      );
      setPending(null);
      const needs = needsRechargeNow(next);
      const keepRecharge = acceptedRecharge || !needs;
      setAcceptedRecharge(keepRecharge);
      setRechargePrompt(false);
      setData(next);
      fillAmounts(next, {
        includeCurrent: keepRecharge,
        includePending: keepRecharge || skipCurrentRecharge,
      });
      toast.success(`${row.label} collected by ${payLabel(payMode)}`);
      inputRef.current?.select();
    } catch (err) {
      toast.error(collectionError(err, 'Could not save collection'));
    } finally {
      setBusyMonth('');
    }
  };

  const printCollection = async (paymentId?: number) => {
    if (!paymentId) return;
    try {
      const res: any = await collectionApi.dispatchPrint(paymentId);
      const payload = res?.data || {};
      if (!res?.success) {
        toast.error(payload.error || 'Print failed. Check printer name in Company Details.');
        return;
      }
      if (payload.type === 'a4') {
        const receipt = collectionData<CollectionReceipt>(await collectionApi.printReceipt(paymentId));
        setA4Receipt(receipt);
        return;
      }
      if (payload.type === 'thermal' || payload.type === 'printed' || payload.type === 'txt') {
        const local = await printOnClientPrinter({
          printerName: payload.printerName,
          rawBase64: payload.rawBase64,
        });
        if (local.ok) {
          toast.success(local.message);
          return;
        }
        const pos: any = await collectionApi.posPrint(paymentId);
        const posData = pos?.data || {};
        if (pos?.success && (posData.type === 'printed' || posData.type === 'txt')) {
          toast.success(posData.message || 'ESC/POS printed');
          return;
        }
        toast.error(posData.error || 'ESC/POS print failed. Check printer name in Company Details.');
        return;
      }
      toast.error('Print did not run. Check printer name in Company Details.');
    } catch (err: any) {
      toast.error(err?.response?.data?.data?.error || collectionError(err, 'Print failed'));
    }
  };

  useEffect(() => {
    if (!pending && !showDetails && !rechargePrompt) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || busyMonth) return;
      if (pending) setPending(null);
      else if (rechargePrompt) cancelRecharge();
      else setShowDetails(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pending, showDetails, rechargePrompt, busyMonth]);

  useEffect(() => {
    if (!a4Receipt) return;
    document.body.classList.add('a4-print-open');
    const close = () => setA4Receipt(null);
    window.addEventListener('afterprint', close);
    const t = window.setTimeout(() => window.print(), 300);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', close);
      document.body.classList.remove('a4-print-open');
    };
  }, [a4Receipt]);

  const cancelRecharge = () => {
    if (!data) return;
    setRechargePrompt(false);
    setAcceptedRecharge(false);
    setSkipCurrentRecharge(true);
    fillAmounts(data, { includeCurrent: false, includePending: true });
  };

  const acceptRecharge = async () => {
    if (!data) return;
    setBusyMonth('recharge');
    try {
      const next = collectionData<CollectionLookup>(
        await collectionApi.recharge(data.customer.customerId)
      );
      setAcceptedRecharge(true);
      setSkipCurrentRecharge(false);
      setRechargePrompt(false);
      setData(next);
      fillAmounts(next, { includeCurrent: true, includePending: true });
      toast.success(`${next.currentMonth?.label || 'This month'} recharged. Collect now or later.`);
    } catch (err) {
      toast.error(collectionError(err, 'Could not recharge'));
    } finally {
      setBusyMonth('');
    }
  };

  const currentReady = Boolean(data) && (acceptedRecharge || !needsRechargeNow(data));
  const pendingReady = currentReady || skipCurrentRecharge;
  const rows = unpaidRows(data, { includeCurrent: currentReady, includePending: pendingReady });
  const currentPaid = Boolean(data?.currentMonth?.paid && data.currentMonth.recharged);
  const payments: CollectionPayment[] = data?.payments || [];
  const filteredPayments = payments.filter((row) => {
    const month = (row.month || '').slice(0, 7);
    if (!month) return false;
    if (appliedFrom && month < appliedFrom.slice(0, 7)) return false;
    if (appliedTo && month > appliedTo.slice(0, 7)) return false;
    return true;
  });
  const paidTotal = filteredPayments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const paymentGroups = (() => {
    const groups: { key: string; label: string; rechargeDate?: string; rows: CollectionPayment[]; total: number }[] = [];
    const index = new Map<string, number>();
    [...filteredPayments]
      .sort((a, b) => String(b.month || '').localeCompare(String(a.month || '')))
      .forEach((row) => {
        const key = row.month || row.monthLabel || String(row.id);
        const at = index.get(key);
        if (at == null) {
          index.set(key, groups.length);
          groups.push({
            key,
            label: monthYearLabel(row),
            rechargeDate: row.rechargeDate,
            rows: [row],
            total: Number(row.amount || 0),
          });
        } else {
          groups[at].rows.push(row);
          groups[at].total += Number(row.amount || 0);
        }
      });
    return groups;
  })();
  const applyDateFilter = (from = fromDate, to = toDate) => {
    if (!from || !to) {
      toast.warning('Select from and to date');
      return;
    }
    if (to < from) {
      toast.warning('To date cannot be before from date');
      return;
    }
    setFromDate(from);
    setToDate(to);
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  const openDetails = () => {
    const from = last3MonthsFrom();
    const to = todayIso();
    setFromDate(from);
    setToDate(to);
    setAppliedFrom(from);
    setAppliedTo(to);
    setShowDetails(true);
  };

  return (
    <div className="col-page">
      <div className="col-card">
        <div className="trp-head">
          <div className="trp-head-icon">
            <i className="fas fa-hand-holding-usd" />
          </div>
          <div>
            <h2 className="mst-title">Collection</h2>
            <p className="trp-sub">Enter customer ID. Recharge the current month if it is not recharged yet.</p>
          </div>
        </div>

        <form
          className="col-search"
          onSubmit={(e) => {
            e.preventDefault();
            lookup();
          }}
        >
          <label>Customer ID</label>
          <div className="col-search-row">
            <input
              ref={inputRef}
              className="mst-inp col-id"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="e.g. C001"
              autoFocus
              autoComplete="off"
            />
            <button className="mst-btn mst-btn-primary" type="submit" disabled={busyMonth === 'lookup'}>
              {busyMonth === 'lookup' ? 'Loading…' : 'Show'}
            </button>
            <button
              className="mst-btn mst-btn-outline col-details-btn"
              type="button"
              title="Reset / refresh"
              disabled={Boolean(busyMonth)}
              onClick={resetEntry}
            >
              <i className="fas fa-sync-alt" />
            </button>
            <button
              className="mst-btn mst-btn-outline col-details-btn"
              type="button"
              title="Paid details"
              disabled={!data}
              onClick={openDetails}
            >
              <i className="fas fa-receipt" />
            </button>
            <button
              className="mst-btn mst-btn-outline col-details-btn"
              type="button"
              title="Print last collection"
              disabled={!data || !(data.lastPaymentId || payments[0]?.id)}
              onClick={() => printCollection(data?.lastPaymentId || payments[0]?.id)}
            >
              <i className="fas fa-print" />
            </button>
          </div>
        </form>

        {data && (
          <>
            <div className="col-details">
              <div className="cust-detail">
                <span>Type</span>
                <strong>
                  <span className={`cust-type-pill ${data.customer.customerType}`}>
                    <i className={data.customer.customerType === 'wifi' ? 'fas fa-wifi' : 'fas fa-tv'} />
                    {data.customer.customerType === 'wifi' ? 'WiFi' : 'Cable'}
                  </span>
                </strong>
              </div>
              <div className="cust-detail">
                <span>Customer ID</span>
                <strong>{data.customer.customerId}</strong>
              </div>
              <div className="cust-detail">
                <span>Name</span>
                <strong>{show(data.customer.name)}</strong>
              </div>
              <div className="cust-detail">
                <span>Mobile</span>
                <strong>{show(data.customer.mobile)}</strong>
              </div>
              <div className="cust-detail">
                <span>Area</span>
                <strong>{show(data.customer.area)}</strong>
              </div>
              <div className="cust-detail">
                <span>Joining Date</span>
                <strong>{show(data.customer.joiningDate)}</strong>
              </div>
              <div className="cust-detail">
                <span>Monthly Amount</span>
                <strong>₹ {Number(data.customer.monthlyAmount || 0).toFixed(0)}</strong>
              </div>
            </div>

            {currentPaid && (
              <div className="col-block">
                <div className="col-block-h">Current Month · {data.currentMonth.label}</div>
                <div className="col-paid on">
                  Recharged on {data.currentMonth.paidDate} · {payLabel(data.currentMonth.payMode)}
                  {data.currentMonth.paidAmount != null ? ` · ₹ ${Number(data.currentMonth.paidAmount).toFixed(0)}` : ''}
                </div>
              </div>
            )}

            {rows.length === 0 && !rechargePrompt && (currentPaid || skipCurrentRecharge) && (
              <div className="col-paid on">No pending recharge months</div>
            )}

            {rows.length > 0 && (
              <div className="col-rows">
                {rows.map((row) => {
                  const isCurrent = data.currentMonth.month === row.month;
                  const isNewRecharge = isCurrent && !row.recharged;
                  return (
                    <div key={row.month} className="col-row">
                      <div className="col-row-meta">
                        <strong>{row.label}</strong>
                        <span className={`col-month ${row.paidAmount ? 'balance' : isCurrent ? 'current' : 'pending'}`}>
                          {isNewRecharge
                            ? `Recharge this month · ₹ ${Number(row.due || 0).toFixed(0)}`
                            : row.paidAmount
                              ? `Pending ₹ ${Number(row.balance || 0).toFixed(0)} / ₹ ${Number(row.due || 0).toFixed(0)}`
                              : isCurrent
                                ? `This month · ₹ ${Number(row.due || 0).toFixed(0)}`
                                : `Pending recharge · ₹ ${Number(row.due || 0).toFixed(0)}`}
                        </span>
                      </div>
                      <div className="col-amount">
                        <span>₹</span>
                        <input
                          className="mst-inp"
                          type="number"
                          min="1"
                          step="1"
                          value={amounts[row.month] || ''}
                          onChange={(e) => setAmounts((prev) => ({ ...prev, [row.month]: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <button
                        className="col-pay-btn cash"
                        type="button"
                        disabled={Boolean(busyMonth)}
                        onClick={() => askCollect(row, 'cash')}
                      >
                        <i className="fas fa-money-bill-wave" /> Cash
                      </button>
                      <button
                        className="col-pay-btn upi"
                        type="button"
                        disabled={Boolean(busyMonth)}
                        onClick={() => askCollect(row, 'upi')}
                      >
                        <i className="fas fa-mobile-alt" /> UPI
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {rechargePrompt && data &&
        createPortal(
          <div className="cust-modal col-recharge-overlay" onClick={() => !busyMonth && cancelRecharge()}>
            <div className="cust-modal-box col-confirm col-recharge-box" onClick={(e) => e.stopPropagation()}>
              <div className="cust-modal-h">
                <div>
                  <h3>Recharge required</h3>
                  <p>
                    {show(data.customer.name)} ({data.customer.customerId})
                  </p>
                </div>
                <button
                  className="mst-icon-btn"
                  type="button"
                  title="Close"
                  disabled={Boolean(busyMonth)}
                  onClick={cancelRecharge}
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              <div className="cust-modal-b col-recharge-body">
                <div className="col-recharge-icon">
                  <i className="fas fa-bolt" />
                </div>
                <p>
                  <strong>{data.currentMonth?.label}</strong> is not recharged for this customer.
                </p>
                <p>Recharge this month, or cancel to collect old pending months only.</p>
              </div>
              <div className="cust-modal-f">
                <button
                  className="mst-btn mst-btn-outline"
                  type="button"
                  disabled={Boolean(busyMonth)}
                  onClick={cancelRecharge}
                >
                  Cancel
                </button>
                <button
                  className="mst-btn mst-btn-primary"
                  type="button"
                  disabled={Boolean(busyMonth)}
                  onClick={acceptRecharge}
                >
                  <i className="fas fa-bolt" /> {busyMonth === 'recharge' ? 'Saving…' : 'Recharge'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {pending && data && (
        <div className="cust-modal" onClick={() => !busyMonth && setPending(null)}>
          <div className="cust-modal-box col-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="cust-modal-h">
              <div>
                <h3>
                  {needsRechargeNow(data) && data.currentMonth?.month === pending.row.month
                    ? 'Confirm Recharge'
                    : 'Confirm Collection'}
                </h3>
                <p>Check details before saving</p>
              </div>
              <button
                className="mst-icon-btn"
                type="button"
                title="Close"
                disabled={Boolean(busyMonth)}
                onClick={() => setPending(null)}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="cust-modal-b">
              <div className="cust-detail">
                <span>Customer</span>
                <strong>
                  {show(data.customer.name)} ({data.customer.customerId})
                </strong>
              </div>
              <div className="cust-detail">
                <span>Month</span>
                <strong>{pending.row.label}</strong>
              </div>
              <div className="cust-detail">
                <span>Amount</span>
                <strong>₹ {Number(pending.amount).toFixed(0)}</strong>
              </div>
              <div className="cust-detail">
                <span>Payment</span>
                <strong>{payLabel(pending.payMode)}</strong>
              </div>
            </div>
            <div className="cust-modal-f">
              <button
                className="mst-btn mst-btn-outline"
                type="button"
                disabled={Boolean(busyMonth)}
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
              <button
                className={`col-pay-btn ${pending.payMode}`}
                type="button"
                disabled={Boolean(busyMonth)}
                onClick={collect}
              >
                {busyMonth === pending.row.month
                  ? 'Saving…'
                  : `Confirm ${payLabel(pending.payMode)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetails && data && (
        <div className="cust-modal" onClick={() => setShowDetails(false)}>
          <div className="cust-modal-box col-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cust-modal-h">
              <div>
                <h3>Paid Details</h3>
                <p>
                  {show(data.customer.name)} ({data.customer.customerId})
                </p>
              </div>
              <button className="mst-icon-btn" type="button" title="Close" onClick={() => setShowDetails(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <form
              className="col-date-filter"
              onSubmit={(e) => {
                e.preventDefault();
                applyDateFilter();
              }}
            >
              <label>
                From
                <input className="mst-inp" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </label>
              <label>
                To
                <input className="mst-inp" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </label>
              <button
                className="mst-btn mst-btn-outline"
                type="button"
                onClick={() => applyDateFilter(last3MonthsFrom(), todayIso())}
              >
                Last 3 months
              </button>
              <button className="mst-btn mst-btn-primary" type="submit">
                Filter
              </button>
            </form>
            <div className="col-details-body">
              {payments.length === 0 ? (
                <div className="mst-empty">
                  <i className="fas fa-receipt" />
                  <div>No payments yet</div>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="mst-empty">
                  <i className="fas fa-calendar-alt" />
                  <div>No payments in this date range</div>
                </div>
              ) : (
                <div className="mst-table-wrap">
                  <table className="mst-table trp-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Recharge Date</th>
                        <th>Paid Date</th>
                        <th>Time</th>
                        <th>Mode</th>
                        <th className="num">Amount</th>
                        <th>Collected By</th>
                        <th style={{ width: 52 }}>Print</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentGroups.map((group) => (
                        <React.Fragment key={group.key}>
                          <tr className="col-month-head">
                            <td colSpan={5}>
                              <strong>{group.label}</strong>
                              {group.rechargeDate ? ` · Recharged ${group.rechargeDate}` : ''}
                            </td>
                            <td className="num">
                              <strong>₹ {group.total.toFixed(0)}</strong>
                            </td>
                            <td colSpan={2} />
                          </tr>
                          {group.rows.map((row, i) => (
                            <tr key={row.id}>
                              <td>{i + 1}</td>
                              <td>{show(row.rechargeDate)}</td>
                              <td>{show(row.paidDate)}</td>
                              <td>{show(row.paidTime)}</td>
                              <td>{payLabel(row.payMode)}</td>
                              <td className="num">
                                <strong>₹ {Number(row.amount || 0).toFixed(0)}</strong>
                              </td>
                              <td>{show(row.collectedBy)}</td>
                              <td>
                                <button
                                  className="mst-icon-btn"
                                  type="button"
                                  title="Print"
                                  onClick={() => printCollection(row.id)}
                                >
                                  <i className="fas fa-print" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={5}>
                          <strong>Total</strong>
                        </td>
                        <td className="num">
                          <strong>₹ {paidTotal.toFixed(0)}</strong>
                        </td>
                        <td />
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {a4Receipt &&
        createPortal(
          <div className="a4-print-host">
            <div className="a4-print-bar no-print">
              <button className="go" type="button" onClick={() => window.print()}>
                Print
              </button>
              <button className="stop" type="button" onClick={() => setA4Receipt(null)}>
                Close
              </button>
            </div>
            <CollectionA4Receipt receipt={a4Receipt} />
          </div>,
          document.body
        )}
    </div>
  );
};

export default CollectionPage;
