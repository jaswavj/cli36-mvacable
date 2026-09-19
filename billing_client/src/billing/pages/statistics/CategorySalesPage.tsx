import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { statsApi, statsData, statsError } from '../../../api/statistics/statistics-api-service';
import '../master/Master.css';
import '../credit/Credit.css';
import './Stats.css';

type Cat = { catId: number; catName: string; totalQty: number; totalAmt: number; billCount: number; productCount: number; topProduct: string; topProductQty: number };
type Prod = { productId: number; productName: string; totalQty: number; totalAmt: number; billCount: number; avgPrice: number };

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);

const speedTier = (rows: Cat[], row: Cat) => {
  const active = rows.filter((r) => r.totalAmt > 0);
  if (row.totalAmt <= 0 || active.length === 0) return 'zero';
  const t33 = active[Math.floor(active.length * 0.33)]?.totalAmt ?? 0;
  const t66 = active[Math.floor(active.length * 0.66)]?.totalAmt ?? 0;
  if (row.totalAmt >= t33) return 'fast';
  if (row.totalAmt >= t66) return 'mid';
  return 'slow';
};

const CategorySalesPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [data, setData] = useState<any>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [prods, setProds] = useState<Prod[]>([]);

  const setRange = (kind: 'today' | 'week' | 'month') => {
    const d = new Date();
    const end = today();
    if (kind === 'today') { setFrom(end); setTo(end); return; }
    if (kind === 'week') {
      const s = new Date(d); s.setDate(d.getDate() - 6);
      setFrom(s.toISOString().slice(0, 10)); setTo(end); return;
    }
    setFrom(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10));
    setTo(end);
  };

  const search = async () => {
    try {
      setOpenId(null);
      setData(statsData(await statsApi.categorySales(from, to)));
    } catch (err) {
      toast.error(statsError(err, 'Could not load report'));
    }
  };

  const toggle = async (catId: number) => {
    if (openId === catId) { setOpenId(null); return; }
    try {
      setProds(statsData<Prod[]>(await statsApi.categoryProducts(catId, from, to)) || []);
      setOpenId(catId);
    } catch (err) {
      toast.error(statsError(err, 'Could not load products'));
    }
  };

  const rows: Cat[] = data?.categories || [];
  const grand = data?.grandAmt || 0;

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-layer-group" /> Category Sales Statistics</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Load</button>
            <button className="mst-btn mst-btn-outline" type="button" onClick={() => setRange('today')}>Today</button>
            <button className="mst-btn mst-btn-outline" type="button" onClick={() => setRange('week')}>7d</button>
            <button className="mst-btn mst-btn-outline" type="button" onClick={() => setRange('month')}>Month</button>
          </div>
        </div>
      </div>
      {data && (
        <>
          <div className="st-kpis">
            <div className="mst-card crd-stat"><div className="crd-stat-l">Total Categories</div><div className="crd-stat-v">{data.totalCats}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Active Categories</div><div className="crd-stat-v">{data.activeCats}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Total Amount</div><div className="crd-stat-v">₹ {n(data.grandAmt)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Total Qty</div><div className="crd-stat-v">{n(data.grandQty)}</div></div>
          </div>
          <div className="mst-card">
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr><th>#</th><th>Category</th><th className="num">Amount</th><th className="num">Qty</th><th className="num">Bills</th><th className="num">Products</th><th>Top Product</th><th>Share</th><th>Speed</th><th /></tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={10} className="mst-empty">No categories.</td></tr>}
                  {rows.map((row, i) => {
                    const share = grand > 0 ? (row.totalAmt / grand) * 100 : 0;
                    const tier = speedTier(rows, row);
                    return (
                      <React.Fragment key={row.catId}>
                        <tr>
                          <td>{i + 1}</td>
                          <td>{row.catName}</td>
                          <td className="num">₹ {n(row.totalAmt)}</td>
                          <td className="num">{n(row.totalQty)}</td>
                          <td className="num">{row.billCount}</td>
                          <td className="num">{row.productCount}</td>
                          <td>{row.topProduct || '—'}</td>
                          <td><div className="st-share"><span style={{ width: `${share}%` }} /></div><div className="mst-note">{share.toFixed(1)}%</div></td>
                          <td><span className={`st-badge ${tier}`}>{tier === 'fast' ? 'Fast' : tier === 'mid' ? 'Mid' : tier === 'slow' ? 'Slow' : 'No Sales'}</span></td>
                          <td><button className="mst-icon-btn" type="button" onClick={() => toggle(row.catId)}><i className={`fas fa-chevron-${openId === row.catId ? 'up' : 'down'}`} /></button></td>
                        </tr>
                        {openId === row.catId && (
                          <tr>
                            <td colSpan={10}>
                              <table className="mst-table">
                                <thead><tr><th>#</th><th>Product</th><th className="num">Avg Price</th><th className="num">Qty</th><th className="num">Amount</th><th className="num">Bills</th></tr></thead>
                                <tbody>
                                  {prods.length === 0 && <tr><td colSpan={6} className="mst-empty">No sales in this period.</td></tr>}
                                  {prods.map((p, pi) => (
                                    <tr key={p.productId}><td>{pi + 1}</td><td>{p.productName}</td><td className="num">₹ {n(p.avgPrice)}</td><td className="num">{n(p.totalQty)}</td><td className="num">₹ {n(p.totalAmt)}</td><td className="num">{p.billCount}</td></tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CategorySalesPage;
