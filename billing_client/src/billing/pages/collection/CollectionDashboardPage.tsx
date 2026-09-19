import React, { useEffect, useMemo, useState } from 'react';
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
  type DashboardData,
} from '../../../api/collection/collection-api-service';
import '../master/Master.css';
import '../credit/Credit.css';
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

const n = (v?: number) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const compact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
};
const trend = (pct?: number, last?: number) =>
  !last ? 'No previous month' : `${(pct || 0) >= 0 ? '▲' : '▼'} ${Math.abs(pct || 0).toFixed(1)}% vs last month`;

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
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<DashboardData | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (y = year, m = month) => {
    setBusy(true);
    try {
      setData(collectionData<DashboardData>(await collectionApi.dashboard(y, m)));
    } catch (err) {
      toast.error(collectionError(err, 'Could not load dashboard'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load(now.getFullYear(), now.getMonth() + 1);
  }, []);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() + 1 - i);
  const daily = data?.daily || [];
  const collectors = data?.collectors || [];
  const expected = Number(data?.expectedAmount || 0);
  const monthDue = Number(data?.monthDueCollected || 0);
  const duePct = expected > 0 ? Math.min(100, (monthDue / expected) * 100) : 0;
  const payPie = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Cash', value: Math.max(0, Number(data.cashTotal || 0)), color: CASH },
      { name: 'UPI', value: Math.max(0, Number(data.upiTotal || 0)), color: UPI },
    ].filter((s) => s.value > 0);
  }, [data]);
  const typePie = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Cable', value: Math.max(0, Number(data.cableTotal || 0)), color: CABLE },
      { name: 'WiFi', value: Math.max(0, Number(data.wifiTotal || 0)), color: WIFI },
    ].filter((s) => s.value > 0);
  }, [data]);
  const payTotal = payPie.reduce((sum, s) => sum + s.value, 0);
  const typeTotal = typePie.reduce((sum, s) => sum + s.value, 0);
  const finalAmt = Number(data?.finalAmount || 0);

  return (
    <div className="mst-page col-dash">
      <h2 className="mst-title">
        <i className="fas fa-tachometer-alt" /> Dashboard
      </h2>

      <div className="mst-card st-filter" style={{ marginBottom: 12 }}>
        <div className="mst-card-b st-filter-row">
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
          <div className="st-filter-acts">
            <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={() => load()}>
              {busy ? 'Loading…' : 'Load'}
            </button>
            {(year !== now.getFullYear() || month !== now.getMonth() + 1) && (
              <button
                className="mst-btn mst-btn-outline"
                type="button"
                onClick={() => {
                  setYear(now.getFullYear());
                  setMonth(now.getMonth() + 1);
                  load(now.getFullYear(), now.getMonth() + 1);
                }}
              >
                Current Month
              </button>
            )}
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="st-kpis">
            <div className="st-kpi sales">
              <div className="st-kpi-l">Collection</div>
              <div className="st-kpi-v">₹ {n(data.collectionTotal)}</div>
              <div className="st-kpi-t">{trend(data.collectionPct, data.lastCollectionTotal)}</div>
            </div>
            <div className="st-kpi expense">
              <div className="st-kpi-l">Expense</div>
              <div className="st-kpi-v">₹ {n(data.expenseTotal)}</div>
              <div className="st-kpi-t">{trend(data.expensePct, data.lastExpenseTotal)}</div>
            </div>
            <div className={`st-kpi profit ${finalAmt >= 0 ? 'up' : 'down'}`}>
              <div className="st-kpi-l">Final amount</div>
              <div className="st-kpi-v">₹ {n(data.finalAmount)}</div>
              <div className="st-kpi-t">{trend(data.finalPct, data.lastFinalAmount)}</div>
            </div>
            <div className="st-kpi purchase">
              <div className="st-kpi-l">Pending due</div>
              <div className="st-kpi-v">₹ {n(data.pendingAmount)}</div>
              <div className="st-kpi-t">{data.pendingCustomers || 0} customers</div>
            </div>
          </div>

          <div className="st-counts">
            <div>
              <em>Cash</em>
              <strong>₹ {n(data.cashTotal)}</strong>
            </div>
            <div>
              <em>UPI</em>
              <strong>₹ {n(data.upiTotal)}</strong>
            </div>
            <div>
              <em>Cable</em>
              <strong>₹ {n(data.cableTotal)}</strong>
            </div>
            <div>
              <em>WiFi</em>
              <strong>₹ {n(data.wifiTotal)}</strong>
            </div>
            <div>
              <em>Active customers</em>
              <strong>{data.activeCustomers || 0}</strong>
            </div>
            <div>
              <em>New connection</em>
              <strong>{data.newConnections || 0}</strong>
            </div>
            <div>
              <em>Disconnection</em>
              <strong>{data.disconnections || 0}</strong>
            </div>
            <div>
              <em>Today collection</em>
              <strong>₹ {n(data.todayCollection)}</strong>
            </div>
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
                  <ComposedChart data={daily} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                    <Bar dataKey="cash" name="Cash" stackId="pay" fill={CASH} maxBarSize={16} />
                    <Bar dataKey="upi" name="UPI" stackId="pay" fill={UPI} radius={[4, 4, 0, 0]} maxBarSize={16} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mst-card">
              <div className="mst-card-h">Payment mix — {data.label}</div>
              <div className="mst-card-b st-chart-body">
                {payTotal <= 0 ? (
                  <div className="mst-empty">No collection in this month.</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie data={payPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={54} outerRadius={82} paddingAngle={3}>
                          {payPie.map((s) => (
                            <Cell key={s.name} fill={s.color} stroke="var(--color-bg-surface)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="st-pie-legend">
                      {payPie.map((s) => (
                        <div key={s.name} className="st-pie-leg">
                          <i style={{ background: s.color }} />
                          <span>{s.name}</span>
                          <b>₹ {n(s.value)}</b>
                          <em>{((s.value / payTotal) * 100).toFixed(1)}%</em>
                        </div>
                      ))}
                      {typePie.map((s) => (
                        <div key={s.name} className="st-pie-leg">
                          <i style={{ background: s.color }} />
                          <span>{s.name}</span>
                          <b>₹ {n(s.value)}</b>
                          <em>{typeTotal ? ((s.value / typeTotal) * 100).toFixed(1) : '0.0'}%</em>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mst-card" style={{ marginTop: 12 }}>
            <div className="mst-card-h">Collector wise — {data.label}</div>
            <div className="mst-card-b">
              {collectors.length === 0 ? (
                <div className="mst-empty">No collection in this month.</div>
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
                          <tr key={row.name}>
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
                      <div key={row.name} className="col-rep-item">
                        <div className="col-rep-item-h">
                          <strong>{row.name || '—'}</strong>
                          <span className="col-rep-amt">₹ {n(row.total)}</span>
                        </div>
                        <div className="col-rep-item-f">
                          <span>{row.count || 0} entries</span>
                          <span>Cash ₹ {n(row.cash)}</span>
                          <span>UPI ₹ {n(row.upi)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CollectionDashboardPage;
