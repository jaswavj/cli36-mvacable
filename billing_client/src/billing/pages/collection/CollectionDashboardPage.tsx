import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  collectionApi,
  collectionData,
  collectionError,
  type AccountExpense,
  type AccountReport,
  type CollectionReport,
  type CollectionReportRow,
  type DashboardCollector,
  type DashboardData,
  type DashboardDay,
  type PendingCustomer,
  type PendingList,
} from '../../../api/collection/collection-api-service';
import {
  customerApi,
  customerData,
  customerError,
  type CableCustomer,
  type PagedCustomers,
} from '../../../api/customer/customer-api-service';
import PageBar, { PAGE_SIZE } from '../../components/PageBar';
import '../master/Master.css';
import '../credit/Credit.css';
import '../customer/Customer.css';
import '../statistics/Stats.css';
import './Collection.css';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const CASH = '#16a34a';
const UPI = '#2563eb';
const CABLE = '#1d4ed8';
const WIFI = '#7c3aed';

type Period = 'month' | 'date';
type TypeFilter = '' | 'cable' | 'wifi';
type CustomerKind = 'active' | 'new' | 'disconnect';
type ModalSpec = {
  title: string;
  kind: 'collection' | 'expense' | 'final' | 'pending' | 'customers';
  from?: string;
  to?: string;
  payMode?: string;
  customerType?: string;
  userId?: number;
  customers?: CustomerKind;
};

const pad = (v: number) => String(v).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayIso = () => isoDate(new Date());
const monthBounds = (y: number, m: number) => ({
  from: `${y}-${pad(m)}-01`,
  to: `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`,
});
const n = (v?: number) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const compact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
};
const trend = (pct?: number, last?: number, vs = 'vs last month') =>
  !last ? 'No previous period' : `${(pct || 0) >= 0 ? '▲' : '▼'} ${Math.abs(pct || 0).toFixed(1)}% ${vs}`;
const payLabel = (mode?: string) => (mode === 'upi' ? 'UPI' : mode === 'cash' ? 'Cash' : mode || '—');
const typeLabel = (type?: string) => (type === 'wifi' ? 'WiFi' : type === 'cable' ? 'Cable' : type || '—');
const show = (v?: string) => (v && v.trim() ? v : '—');

const TypePill: React.FC<{ type?: string }> = ({ type }) => (
  <span className={`cust-type-pill ${type === 'wifi' ? 'wifi' : 'cable'}`}>{typeLabel(type)}</span>
);

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="st-tip">
      <div className="st-tip-d">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="st-tip-row">
          <i style={{ background: p.color }} />
          {p.name}: ₹ {n(p.value)}
        </div>
      ))}
    </div>
  );
};

const CollectionDashboardPage: React.FC = () => {
  const now = new Date();
  const [period, setPeriod] = useState<Period>('month');
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [from, setFrom] = useState(todayIso);
  const [to, setTo] = useState(todayIso);
  const [data, setData] = useState<DashboardData | null>(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalSpec | null>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [collections, setCollections] = useState<CollectionReport | null>(null);
  const [account, setAccount] = useState<AccountReport | null>(null);
  const [pendingRows, setPendingRows] = useState<PendingCustomer[]>([]);
  const [customerRows, setCustomerRows] = useState<CableCustomer[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');
  const [modalPage, setModalPage] = useState(1);
  const [modalTotal, setModalTotal] = useState(0);

  const load = async (nextPeriod = period, y = year, m = month, fromDate = from, toDate = to) => {
    if (nextPeriod === 'date') {
      if (!fromDate || !toDate) {
        toast.warning('Select from and to date');
        return;
      }
      if (toDate < fromDate) {
        toast.warning('To date cannot be before from date');
        return;
      }
    }
    setBusy(true);
    try {
      setData(
        collectionData<DashboardData>(
          nextPeriod === 'date'
            ? await collectionApi.dashboard(y, m, fromDate, toDate)
            : await collectionApi.dashboard(y, m)
        )
      );
    } catch (err) {
      toast.error(collectionError(err, 'Could not load dashboard'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load('month', now.getFullYear(), now.getMonth() + 1);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() + 1 - i);
  const daily = data?.daily || [];
  const collectors = data?.collectors || [];
  const expected = Number(data?.expectedAmount || 0);
  const monthDue = Number(data?.monthDueCollected || 0);
  const duePct = expected > 0 ? Math.min(100, (monthDue / expected) * 100) : 0;
  const vsLabel = period === 'date' ? 'vs previous period' : 'vs last month';
  const range = () => {
    if (data?.from && data?.to) return { from: data.from, to: data.to };
    return period === 'date' ? { from, to } : monthBounds(year, month);
  };
  const payPie = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Cash', value: Math.max(0, Number(data.cashTotal || 0)), color: CASH, key: 'cash' },
      { name: 'UPI', value: Math.max(0, Number(data.upiTotal || 0)), color: UPI, key: 'upi' },
    ].filter((s) => s.value > 0);
  }, [data]);
  const typePie = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Cable', value: Math.max(0, Number(data.cableTotal || 0)), color: CABLE, key: 'cable' },
      { name: 'WiFi', value: Math.max(0, Number(data.wifiTotal || 0)), color: WIFI, key: 'wifi' },
    ].filter((s) => s.value > 0);
  }, [data]);
  const payTotal = payPie.reduce((sum, s) => sum + s.value, 0);
  const typeTotal = typePie.reduce((sum, s) => sum + s.value, 0);
  const finalAmt = Number(data?.finalAmount || 0);
  const dailyRows = daily.filter((row) => Number(row.total || 0) > 0);

  const closeModal = () => {
    setModal(null);
    setCollections(null);
    setAccount(null);
    setPendingRows([]);
    setCustomerRows([]);
    setTypeFilter('');
    setModalPage(1);
    setModalTotal(0);
    setModalBusy(false);
  };

  const openModal = (spec: ModalSpec) => {
    setCollections(null);
    setAccount(null);
    setPendingRows([]);
    setCustomerRows([]);
    setModalTotal(0);
    setModalPage(1);
    setTypeFilter(spec.customerType === 'wifi' || spec.customerType === 'cable' ? spec.customerType : '');
    setModal(spec);
  };

  useEffect(() => {
    if (!modal) return;
    let cancelled = false;
    const run = async () => {
      setModalBusy(true);
      try {
        if (modal.kind === 'collection') {
          const next = collectionData<CollectionReport>(
            await collectionApi.report(
              modal.from || '',
              modal.to || '',
              modal.userId,
              modal.payMode,
              typeFilter || undefined,
              modalPage,
              PAGE_SIZE
            )
          );
          if (cancelled) return;
          setCollections(next);
          setModalTotal(next.count || 0);
        } else if (modal.kind === 'expense' || modal.kind === 'final') {
          const next = collectionData<AccountReport>(await collectionApi.account(modal.from || '', modal.to || ''));
          if (cancelled) return;
          setAccount(next);
        } else if (modal.kind === 'pending') {
          const next = collectionData<PendingList>(
            await collectionApi.pendingCustomers({ type: typeFilter, page: modalPage, size: PAGE_SIZE })
          );
          if (cancelled) return;
          setPendingRows(next.rows || []);
          setModalTotal(next.total || 0);
        } else if (modal.customers === 'active') {
          const next = customerData<PagedCustomers>(
            await customerApi.list({ type: typeFilter, activeOnly: true, page: modalPage, size: PAGE_SIZE })
          );
          if (cancelled) return;
          setCustomerRows(next.rows || []);
          setModalTotal(next.total || 0);
        } else if (modal.customers === 'new') {
          const next = customerData<PagedCustomers>(
            await customerApi.connections(modal.from || '', modal.to || '', {
              type: typeFilter,
              page: modalPage,
              size: PAGE_SIZE,
            })
          );
          if (cancelled) return;
          setCustomerRows(next.rows || []);
          setModalTotal(next.total || 0);
        } else if (modal.customers === 'disconnect') {
          const next = customerData<PagedCustomers>(
            await customerApi.disconnections(modal.from || '', modal.to || '', {
              type: typeFilter,
              page: modalPage,
              size: PAGE_SIZE,
            })
          );
          if (cancelled) return;
          setCustomerRows(next.rows || []);
          setModalTotal(next.total || 0);
        }
      } catch (err) {
        if (cancelled) return;
        toast.error(
          modal.kind === 'customers'
            ? customerError(err, 'Could not load details')
            : collectionError(err, 'Could not load details')
        );
        closeModal();
      } finally {
        if (!cancelled) setModalBusy(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal, modalPage, typeFilter]);

  const openRange = (
    kind: ModalSpec['kind'],
    title: string,
    extra: Partial<ModalSpec> = {},
    dates?: { from: string; to: string }
  ) => {
    const next = dates || range();
    openModal({ title, kind, from: next.from, to: next.to, ...extra });
  };

  const openDay = (row: DashboardDay) => {
    if (!row.iso) return;
    openRange('collection', `Collection — ${row.date}`, {}, { from: row.iso, to: row.iso });
  };

  const openCollector = (row: DashboardCollector) => {
    openRange('collection', `Collection — ${row.name || 'User'}`, row.userId ? { userId: row.userId } : {});
  };

  const switchPeriod = (next: Period) => {
    setPeriod(next);
    if (next === 'month') load('month', year, month);
    else load('date', year, month, from, to);
  };

  return (
    <div className="mst-page col-dash">
      <h2 className="mst-title">
        <i className="fas fa-tachometer-alt" /> Dashboard
      </h2>

      <div className="mst-card st-filter" style={{ marginBottom: 12 }}>
        <div className="mst-card-b st-filter-row">
          <div className="cust-tabs" style={{ marginBottom: 0 }}>
            <button type="button" className={`cust-tab${period === 'month' ? ' on' : ''}`} onClick={() => switchPeriod('month')}>
              Month wise
            </button>
            <button type="button" className={`cust-tab${period === 'date' ? ' on' : ''}`} onClick={() => switchPeriod('date')}>
              Date wise
            </button>
          </div>
          {period === 'month' ? (
            <>
              <div className="mst-fg">
                <label>Year</label>
                <select className="mst-sel" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mst-fg">
                <label>Month</label>
                <select className="mst-sel" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                  {MONTHS.map((name, i) => (
                    <option key={name} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="mst-fg col-dash-date">
                <label>From Date</label>
                <input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="mst-fg col-dash-date">
                <label>To Date</label>
                <input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
          )}
          <div className="st-filter-acts">
            <button
              className="mst-btn mst-btn-primary"
              type="button"
              disabled={busy}
              onClick={() => load()}
            >
              {busy ? 'Loading…' : 'Load'}
            </button>
            {period === 'month' && (year !== now.getFullYear() || month !== now.getMonth() + 1) && (
              <button
                className="mst-btn mst-btn-outline"
                type="button"
                onClick={() => {
                  const y = now.getFullYear();
                  const m = now.getMonth() + 1;
                  setYear(y);
                  setMonth(m);
                  load('month', y, m);
                }}
              >
                Current Month
              </button>
            )}
            {period === 'date' && (
              <>
                <button
                  className="mst-btn mst-btn-outline"
                  type="button"
                  onClick={() => {
                    const t = todayIso();
                    setFrom(t);
                    setTo(t);
                    load('date', year, month, t, t);
                  }}
                >
                  Today
                </button>
                <button
                  className="mst-btn mst-btn-outline"
                  type="button"
                  onClick={() => {
                    const bounds = monthBounds(now.getFullYear(), now.getMonth() + 1);
                    const end = todayIso();
                    setFrom(bounds.from);
                    setTo(end);
                    load('date', now.getFullYear(), now.getMonth() + 1, bounds.from, end);
                  }}
                >
                  This Month
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="st-kpis">
            <button type="button" className="st-kpi sales col-dash-card" onClick={() => openRange('collection', `Collection — ${data.label}`)}>
              <div className="col-kpi-head">
                <span className="st-kpi-l">Collection</span>
                <span className="col-kpi-icon">
                  <i className="fas fa-hand-holding-usd" />
                </span>
              </div>
              <div className="st-kpi-v">₹ {n(data.collectionTotal)}</div>
              <div className="st-kpi-t">{trend(data.collectionPct, data.lastCollectionTotal, vsLabel)}</div>
            </button>
            <button type="button" className="st-kpi expense col-dash-card" onClick={() => openRange('expense', `Expense — ${data.label}`)}>
              <div className="col-kpi-head">
                <span className="st-kpi-l">Expense</span>
                <span className="col-kpi-icon">
                  <i className="fas fa-receipt" />
                </span>
              </div>
              <div className="st-kpi-v">₹ {n(data.expenseTotal)}</div>
              <div className="st-kpi-t">{trend(data.expensePct, data.lastExpenseTotal, vsLabel)}</div>
            </button>
            <button
              type="button"
              className={`st-kpi profit col-dash-card ${finalAmt >= 0 ? 'up' : 'down'}`}
              onClick={() => openRange('final', `Final amount — ${data.label}`)}
            >
              <div className="col-kpi-head">
                <span className="st-kpi-l">Final amount</span>
                <span className="col-kpi-icon">
                  <i className="fas fa-wallet" />
                </span>
              </div>
              <div className="st-kpi-v">₹ {n(data.finalAmount)}</div>
              <div className="st-kpi-t">{trend(data.finalPct, data.lastFinalAmount, vsLabel)}</div>
            </button>
            <button
              type="button"
              className="st-kpi purchase col-dash-card"
              onClick={() => openModal({ title: 'Pending due', kind: 'pending' })}
            >
              <div className="col-kpi-head">
                <span className="st-kpi-l">Pending due</span>
                <span className="col-kpi-icon">
                  <i className="fas fa-exclamation-circle" />
                </span>
              </div>
              <div className="st-kpi-v">₹ {n(data.pendingAmount)}</div>
              <div className="st-kpi-t">{data.pendingCustomers || 0} customers</div>
            </button>
          </div>

          <div className="st-counts">
            <button type="button" onClick={() => openRange('collection', `Cash — ${data.label}`, { payMode: 'cash' })}>
              <em>
                <i className="fas fa-money-bill-wave" /> Cash
              </em>
              <strong>₹ {n(data.cashTotal)}</strong>
            </button>
            <button type="button" onClick={() => openRange('collection', `UPI — ${data.label}`, { payMode: 'upi' })}>
              <em>
                <i className="fas fa-mobile-alt" /> UPI
              </em>
              <strong>₹ {n(data.upiTotal)}</strong>
            </button>
            <button type="button" onClick={() => openRange('collection', `Cable — ${data.label}`, { customerType: 'cable' })}>
              <em>
                <i className="fas fa-tv" /> Cable
              </em>
              <strong>₹ {n(data.cableTotal)}</strong>
            </button>
            <button type="button" onClick={() => openRange('collection', `WiFi — ${data.label}`, { customerType: 'wifi' })}>
              <em>
                <i className="fas fa-wifi" /> WiFi
              </em>
              <strong>₹ {n(data.wifiTotal)}</strong>
            </button>
            <button
              type="button"
              onClick={() => openModal({ title: 'Active customers', kind: 'customers', customers: 'active' })}
            >
              <em>
                <i className="fas fa-users" /> Active customers
              </em>
              <strong>{data.activeCustomers || 0}</strong>
            </button>
            <button
              type="button"
              onClick={() => openRange('customers', `New connection — ${data.label}`, { customers: 'new' })}
            >
              <em>
                <i className="fas fa-user-plus" /> New connection
              </em>
              <strong>{data.newConnections || 0}</strong>
            </button>
            <button
              type="button"
              onClick={() => openRange('customers', `Disconnection — ${data.label}`, { customers: 'disconnect' })}
            >
              <em>
                <i className="fas fa-user-slash" /> Disconnection
              </em>
              <strong>{data.disconnections || 0}</strong>
            </button>
            <button
              type="button"
              onClick={() => {
                const t = todayIso();
                openRange('collection', 'Today collection', {}, { from: t, to: t });
              }}
            >
              <em>
                <i className="fas fa-calendar-day" /> Today collection
              </em>
              <strong>₹ {n(data.todayCollection)}</strong>
            </button>
          </div>

          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-h">Month due collected — {data.label}</div>
            <div className="mst-card-b">
              <div className="col-dash-due">
                <span>
                  Collected ₹ {n(data.monthDueCollected)} of expected ₹ {n(data.expectedAmount)}
                </span>
                <strong>{duePct.toFixed(0)}%</strong>
              </div>
              <div className="st-share">
                <span style={{ width: `${duePct}%` }} />
              </div>
              <div className="mst-note" style={{ marginTop: 8 }}>
                {data.collectionCount || 0} receipts · {data.expenseCount || 0} expenses · {data.todayCount || 0} today
                · Cable {data.cableCustomers || 0} · WiFi {data.wifiCustomers || 0}
              </div>
            </div>
          </div>

          <div className="st-charts">
            <div className="mst-card">
              <div className="mst-card-h">Daily collection — {data.label}</div>
              <div className="mst-card-b st-chart-body">
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart
                    data={daily}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    onClick={(e: any) => e?.activePayload?.[0]?.payload && openDay(e.activePayload[0].payload)}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => String(v).slice(0, 2)}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={1}
                    />
                    <YAxis
                      tickFormatter={compact}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={46}
                    />
                    <Tooltip content={<ChartTip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="cash" name="Cash" stackId="pay" fill={CASH} maxBarSize={16} cursor="pointer" />
                    <Bar dataKey="upi" name="UPI" stackId="pay" fill={UPI} radius={[4, 4, 0, 0]} maxBarSize={16} cursor="pointer" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mst-card">
              <div className="mst-card-h">Payment mix — {data.label}</div>
              <div className="mst-card-b st-chart-body">
                {payTotal <= 0 ? (
                  <div className="mst-empty">No collection in this period.</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie
                          data={payPie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={54}
                          outerRadius={82}
                          paddingAngle={3}
                          onClick={(slice: any) => {
                            const key = slice?.payload?.key || slice?.key;
                            const name = slice?.payload?.name || slice?.name;
                            if (key) openRange('collection', `${name} — ${data.label}`, { payMode: key });
                          }}
                        >
                          {payPie.map((s) => (
                            <Cell key={s.name} fill={s.color} stroke="var(--color-bg-surface)" strokeWidth={2} cursor="pointer" />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="st-pie-legend">
                      {payPie.map((s) => (
                        <button
                          key={s.name}
                          type="button"
                          className="st-pie-leg col-dash-leg"
                          onClick={() => openRange('collection', `${s.name} — ${data.label}`, { payMode: s.key })}
                        >
                          <i style={{ background: s.color }} />
                          <span>{s.name}</span>
                          <b>₹ {n(s.value)}</b>
                          <em>{((s.value / payTotal) * 100).toFixed(1)}%</em>
                        </button>
                      ))}
                      {typePie.map((s) => (
                        <button
                          key={s.name}
                          type="button"
                          className="st-pie-leg col-dash-leg"
                          onClick={() =>
                            openRange('collection', `${s.name} — ${data.label}`, { customerType: s.key })
                          }
                        >
                          <i style={{ background: s.color }} />
                          <span>{s.name}</span>
                          <b>₹ {n(s.value)}</b>
                          <em>{typeTotal ? ((s.value / typeTotal) * 100).toFixed(1) : '0.0'}%</em>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mst-card" style={{ marginTop: 12 }}>
            <div className="mst-card-h">Date wise — {data.label}</div>
            <div className="mst-card-b">
              {dailyRows.length === 0 ? (
                <div className="mst-empty">No collection in this period.</div>
              ) : (
                <>
                  <div className="mst-table-wrap col-dash-table">
                    <table className="mst-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th className="num">Cash</th>
                          <th className="num">UPI</th>
                          <th className="num">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyRows.map((row) => (
                          <tr key={row.iso || row.date} className="mst-click-row" onClick={() => openDay(row)}>
                            <td>{row.date}</td>
                            <td className="num">₹ {n(row.cash)}</td>
                            <td className="num">₹ {n(row.upi)}</td>
                            <td className="num">
                              <strong>₹ {n(row.total)}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="col-rep-list">
                    {dailyRows.map((row) => (
                      <button key={row.iso || row.date} type="button" className="col-rep-item col-dash-day" onClick={() => openDay(row)}>
                        <div className="col-rep-item-h">
                          <strong>{row.date}</strong>
                          <span className="col-rep-amt">₹ {n(row.total)}</span>
                        </div>
                        <div className="col-rep-item-f">
                          <span>Cash ₹ {n(row.cash)}</span>
                          <span>UPI ₹ {n(row.upi)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mst-card" style={{ marginTop: 12 }}>
            <div className="mst-card-h">Collector wise — {data.label}</div>
            <div className="mst-card-b">
              {collectors.length === 0 ? (
                <div className="mst-empty">No collection in this period.</div>
              ) : (
                <>
                  <div className="mst-table-wrap col-dash-table">
                    <table className="mst-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th className="num">Entries</th>
                          <th className="num">Cash</th>
                          <th className="num">UPI</th>
                          <th className="num">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collectors.map((row) => (
                          <tr key={row.userId || row.name} className="mst-click-row" onClick={() => openCollector(row)}>
                            <td>{row.name || '—'}</td>
                            <td className="num">{row.count || 0}</td>
                            <td className="num">₹ {n(row.cash)}</td>
                            <td className="num">₹ {n(row.upi)}</td>
                            <td className="num">
                              <strong>₹ {n(row.total)}</strong>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="col-rep-list">
                    {collectors.map((row) => (
                      <button key={row.userId || row.name} type="button" className="col-rep-item col-dash-day" onClick={() => openCollector(row)}>
                        <div className="col-rep-item-h">
                          <strong>{row.name || '—'}</strong>
                          <span className="col-rep-amt">₹ {n(row.total)}</span>
                        </div>
                        <div className="col-rep-item-f">
                          <span>{row.count || 0} entries</span>
                          <span>Cash ₹ {n(row.cash)}</span>
                          <span>UPI ₹ {n(row.upi)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {modal &&
        createPortal(
          <div className="crd-modal col-dash-modal" onClick={closeModal}>
            <div className="crd-modal-box" onClick={(e) => e.stopPropagation()}>
              <div className="crd-modal-h">
                <h3>{modal.title}</h3>
                <button className="mst-icon-btn" type="button" onClick={closeModal} aria-label="Close">
                  <i className="fas fa-times" />
                </button>
              </div>
              {(modal.kind === 'collection' || modal.kind === 'pending' || modal.kind === 'customers') && (
                <div className="col-dash-modal-filters">
                  {(['', 'cable', 'wifi'] as const).map((type) => (
                    <button
                      key={type || 'all'}
                      type="button"
                      className={`cust-filter${typeFilter === type ? ' on' : ''}`}
                      onClick={() => {
                        setTypeFilter(type);
                        setModalPage(1);
                      }}
                    >
                      {type === '' ? 'All' : type === 'cable' ? 'Cable' : 'WiFi'}
                    </button>
                  ))}
                </div>
              )}
              <div className="crd-modal-body col-dash-modal-b">
                {modalBusy && <div className="mst-empty">Loading details…</div>}
                {!modalBusy && modal.kind === 'collection' && (
                  <>
                    <CollectionRows rows={collections?.rows || []} total={collections?.totalAmount} />
                    <PageBar page={modalPage} total={modalTotal} onPage={setModalPage} />
                  </>
                )}
                {!modalBusy && modal.kind === 'expense' && (
                  <ExpenseRows rows={account?.expenses || []} total={account?.expenseTotal} />
                )}
                {!modalBusy && modal.kind === 'final' && account && (
                  <>
                    <div className="col-dash-modal-stats">
                      <div>
                        <em>Collection</em>
                        <strong>₹ {n(account.collectionTotal)}</strong>
                      </div>
                      <div>
                        <em>Expense</em>
                        <strong>₹ {n(account.expenseTotal)}</strong>
                      </div>
                      <div>
                        <em>Final</em>
                        <strong>₹ {n(account.finalAmount)}</strong>
                      </div>
                    </div>
                    <ExpenseRows rows={account.expenses || []} total={account.expenseTotal} />
                  </>
                )}
                {!modalBusy && modal.kind === 'pending' && (
                  <>
                    <PendingRows rows={pendingRows} />
                    <PageBar page={modalPage} total={modalTotal} onPage={setModalPage} />
                  </>
                )}
                {!modalBusy && modal.kind === 'customers' && (
                  <>
                    <CustomerRows rows={customerRows} kind={modal.customers || 'active'} />
                    <PageBar page={modalPage} total={modalTotal} onPage={setModalPage} />
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

const CollectionRows: React.FC<{ rows: CollectionReportRow[]; total?: number }> = ({ rows, total }) => {
  if (!rows.length) return <div className="mst-empty">No collection in this period.</div>;
  return (
    <>
      <div className="col-dash-modal-list">
        {rows.map((row) => (
          <article key={row.id} className="col-rep-item">
            <div className="col-rep-item-h">
              <strong>{row.customerName || row.customerId || '—'}</strong>
              <span className="col-rep-amt">₹ {n(row.amount)}</span>
            </div>
            <div className="col-rep-item-m">
              <strong>{row.customerId}</strong>
              <TypePill type={row.customerType} />
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
        <div className="col-rep-item total">
          <span>Grand Total</span>
          <span className="col-rep-amt">₹ {n(total)}</span>
        </div>
      </div>
      <div className="mst-table-wrap col-dash-modal-table">
        <table className="mst-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
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
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td>{i + 1}</td>
                <td>
                  {row.paidDate || '—'} {row.paidTime || ''}
                </td>
                <td>
                  <TypePill type={row.customerType} />
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
            <tr>
              <td colSpan={7}>
                <strong>Grand Total</strong>
              </td>
              <td className="num">
                <strong>₹ {n(total)}</strong>
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

const ExpenseRows: React.FC<{ rows: AccountExpense[]; total?: number }> = ({ rows, total }) => {
  if (!rows.length) return <div className="mst-empty">No expense in this period.</div>;
  return (
    <>
      <div className="col-dash-modal-list">
        {rows.map((row) => (
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
        <div className="col-rep-item total">
          <span>Expense Total</span>
          <span className="col-rep-amt">₹ {n(total)}</span>
        </div>
      </div>
      <div className="mst-table-wrap col-dash-modal-table">
        <table className="mst-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Expense For</th>
              <th>User</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td>{i + 1}</td>
                <td>
                  {row.expenseDate || '—'} {row.expenseTime || ''}
                </td>
                <td>{row.expenseFor || '—'}</td>
                <td>{row.userName || '—'}</td>
                <td className="num">
                  <strong>₹ {n(row.amount)}</strong>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={4}>
                <strong>Expense Total</strong>
              </td>
              <td className="num">
                <strong>₹ {n(total)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

const PendingRows: React.FC<{ rows: PendingCustomer[] }> = ({ rows }) => {
  if (!rows.length) return <div className="mst-empty">No pending due customers.</div>;
  const total = rows.reduce((sum, row) => sum + Number(row.pendingAmount || 0), 0);
  return (
    <>
      <div className="col-dash-modal-list">
        {rows.map((row) => (
          <article key={row.id} className="col-rep-item">
            <div className="col-rep-item-h">
              <strong>{row.name}</strong>
              <span className="col-rep-amt">₹ {n(row.pendingAmount)}</span>
            </div>
            <div className="col-rep-item-m">
              <strong>{row.customerId}</strong>
              <TypePill type={row.customerType} />
              <span>{show(row.area)}</span>
            </div>
            <div className="col-rep-item-f">
              <span>From {show(row.firstPendingMonth)}</span>
              <span>{row.pendingMonths || 0} months</span>
            </div>
          </article>
        ))}
        <div className="col-rep-item total">
          <span>
            {rows.length} customers
          </span>
          <span className="col-rep-amt">₹ {n(total)}</span>
        </div>
      </div>
      <div className="mst-table-wrap col-dash-modal-table">
        <table className="mst-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Customer ID</th>
              <th>Name</th>
              <th>Area</th>
              <th>Pending From</th>
              <th className="num">Months</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td>{i + 1}</td>
                <td>
                  <TypePill type={row.customerType} />
                </td>
                <td>
                  <strong>{row.customerId}</strong>
                </td>
                <td>{row.name}</td>
                <td>{show(row.area)}</td>
                <td>{show(row.firstPendingMonth)}</td>
                <td className="num">{row.pendingMonths || 0}</td>
                <td className="num">
                  <strong className="cust-pending-amt">₹ {n(row.pendingAmount)}</strong>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={7}>
                <strong>{rows.length} customers</strong>
              </td>
              <td className="num">
                <strong>₹ {n(total)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

const CustomerRows: React.FC<{ rows: CableCustomer[]; kind: CustomerKind }> = ({ rows, kind }) => {
  if (!rows.length) {
    return (
      <div className="mst-empty">
        {kind === 'disconnect' ? 'No disconnections in this period.' : kind === 'new' ? 'No new connections in this period.' : 'No active customers.'}
      </div>
    );
  }
  return (
    <>
      <div className="col-dash-modal-list">
        {rows.map((row) => (
          <article key={row.id} className="col-rep-item">
            <div className="col-rep-item-h">
              <strong>{row.name}</strong>
              <span className="col-rep-amt">₹ {n(row.monthlyAmount)}</span>
            </div>
            <div className="col-rep-item-m">
              <strong>{row.customerId}</strong>
              <TypePill type={row.customerType} />
              <span>{show(row.area)}</span>
            </div>
            <div className="col-rep-item-f">
              <span>Joined {show(row.joiningDate)}</span>
              {kind === 'disconnect' && <span>Disconnected {show(row.disconnectDate)}</span>}
            </div>
          </article>
        ))}
      </div>
      <div className="mst-table-wrap col-dash-modal-table">
        <table className="mst-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Customer ID</th>
              <th>Name</th>
              <th>Mobile</th>
              <th>Area</th>
              <th>Joined</th>
              {kind === 'disconnect' && <th>Disconnected</th>}
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td>{i + 1}</td>
                <td>
                  <TypePill type={row.customerType} />
                </td>
                <td>
                  <strong>{row.customerId}</strong>
                </td>
                <td>{row.name}</td>
                <td>{show(row.mobile)}</td>
                <td>{show(row.area)}</td>
                <td>{show(row.joiningDate)}</td>
                {kind === 'disconnect' && <td>{show(row.disconnectDate)}</td>}
                <td className="num">
                  <strong>₹ {n(row.monthlyAmount)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default CollectionDashboardPage;
