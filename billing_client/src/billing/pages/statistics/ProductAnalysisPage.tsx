import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { statsApi, statsData, statsError } from '../../../api/statistics/statistics-api-service';
import { billingApi } from '../../../api/billing/billing-api-service';
import '../master/Master.css';
import '../credit/Credit.css';
import './Stats.css';

type Hit = { id: number; name: string; code?: string };
type Sec = { count: number; totalQty: number; totalAmt: number; totalCost?: number; outCount?: number; inCount?: number; totalAdd?: number; totalRemove?: number; rows: any[] };

const productNames = (raw: unknown): string[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item : item?.name || item?.productName || ''))
    .filter((name): name is string => Boolean(name));
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);
const tabs = [
  { id: 'sales', label: 'Sales' },
  { id: 'salesReturn', label: 'Sales Return' },
  { id: 'purchase', label: 'Purchase' },
  { id: 'purchaseReturn', label: 'Purchase Return' },
  { id: 'exchange', label: 'Exchange' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'stockAdj', label: 'Stock Adj' },
];

const adjLabel = (t: string) => (t === '1' ? 'Added' : t === '3' ? 'Damage' : t === '4' ? 'Internal Use' : 'Removed');

const ProductAnalysisPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<string[]>([]);
  const [prod, setProd] = useState<Hit | null>(null);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('sales');
  const timer = useRef<number | null>(null);

  const searchProd = (q: string) => {
    setTerm(q);
    setProd(null);
    if (timer.current) window.clearTimeout(timer.current);
    if (!q.trim()) { setHits([]); return; }
    timer.current = window.setTimeout(async () => {
      try {
        const res: any = await billingApi.searchProducts(q.trim());
        setHits(productNames(res?.data));
      } catch {
        setHits([]);
      }
    }, 250);
  };

  const selectProd = async (name: string) => {
    setTerm(name);
    setHits([]);
    try {
      const res: any = await billingApi.productByName(name);
      const p = res?.data;
      if (!p?.id) {
        toast.warning('Product not found.');
        setProd(null);
        return;
      }
      setProd({ id: p.id, name: p.name || name, code: p.code });
    } catch {
      setProd(null);
      toast.error('Could not load product');
    }
  };

  const generate = async () => {
    if (!prod) { toast.warning('Please select a product from the list.'); return; }
    try {
      setData(statsData(await statsApi.productAnalysis(prod.id, from, to)));
      setTab('sales');
    } catch (err) {
      toast.error(statsError(err, 'Could not load report'));
    }
  };

  const sec = (id: string): Sec => data?.[id] || { count: 0, totalQty: 0, totalAmt: 0, rows: [] };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-cube" /> Product Analysis Report</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg crd-search-wrap">
            <label>Product <span className="req">*</span></label>
            <input className="mst-inp" value={term} placeholder="Type name or code…" onChange={(e) => searchProd(e.target.value)} />
            {hits.length > 0 && (
              <ul className="crd-dropdown">
                {hits.map((name) => (
                  <li key={name} onClick={() => { void selectProd(name); }}>{name}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={generate}>Generate Report</button>
            <button className="mst-btn mst-btn-outline" type="button" onClick={() => { setProd(null); setTerm(''); setData(null); setHits([]); }}>Reset</button>
          </div>
        </div>
      </div>
      {data && prod && (
        <>
          <div className="mst-note" style={{ marginBottom: 10 }}><strong>{prod.name}</strong> · {from} — {to}</div>
          <div className="st-kpis" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Sales</div><div className="crd-stat-v">₹ {n(sec('sales').totalAmt)}</div><div className="mst-note">{sec('sales').count} / qty {n(sec('sales').totalQty)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Purchase</div><div className="crd-stat-v">₹ {n(sec('purchase').totalAmt)}</div><div className="mst-note">{sec('purchase').count} / qty {n(sec('purchase').totalQty)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Returns</div><div className="crd-stat-v">₹ {n(sec('salesReturn').totalAmt + sec('purchaseReturn').totalAmt)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Exchange / Cancel</div><div className="crd-stat-v">{sec('exchange').count} / {sec('cancelled').count}</div></div>
          </div>
          <div className="st-tabs">
            {tabs.map((t) => (
              <button key={t.id} className={`mst-btn ${tab === t.id ? 'mst-btn-primary' : 'mst-btn-outline'}`} type="button" onClick={() => setTab(t.id)}>
                {t.label} ({sec(t.id).count})
              </button>
            ))}
          </div>
          <div className="mst-card">
            <div className="mst-table-wrap">
              {tab === 'sales' && (
                <table className="mst-table">
                  <thead><tr><th>#</th><th>Bill</th><th>Date</th><th>Customer</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Disc</th><th className="num">GST</th><th className="num">Total</th><th className="num">Cost</th><th className="num">Profit</th><th>User</th></tr></thead>
                  <tbody>
                    {sec('sales').rows.length === 0 && <tr><td colSpan={12} className="mst-empty">No sales found.</td></tr>}
                    {sec('sales').rows.map((r, i) => {
                      const profit = r.total - (r.cost * r.qty);
                      return (
                        <tr key={i}><td>{i + 1}</td><td>{r.bill}</td><td>{r.date}</td><td>{r.cus}</td><td className="num">{n(r.qty)}</td><td className="num">{n(r.price)}</td><td className="num">{n(r.disc)}</td><td className="num">{n(r.gst)}</td><td className="num">{n(r.total)}</td><td className="num">{n(r.cost)}</td><td className={`num ${profit >= 0 ? 'st-pos' : 'st-neg'}`}>{n(profit)}</td><td>{r.user}</td></tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {tab === 'salesReturn' && (
                <table className="mst-table">
                  <thead><tr><th>#</th><th>Bill</th><th>Date</th><th>Customer</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Total</th><th>User</th></tr></thead>
                  <tbody>
                    {sec('salesReturn').rows.length === 0 && <tr><td colSpan={8} className="mst-empty">No sales returns.</td></tr>}
                    {sec('salesReturn').rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.bill}</td><td>{r.date}</td><td>{r.cus}</td><td className="num">{n(r.qty)}</td><td className="num">{n(r.price)}</td><td className="num">{n(r.total)}</td><td>{r.user}</td></tr>)}
                  </tbody>
                </table>
              )}
              {tab === 'purchase' && (
                <table className="mst-table">
                  <thead><tr><th>#</th><th>GRN</th><th>Invoice</th><th>Date</th><th>Supplier</th><th className="num">Qty</th><th className="num">Free</th><th className="num">Rate</th><th className="num">MRP</th><th className="num">Net</th><th>User</th></tr></thead>
                  <tbody>
                    {sec('purchase').rows.length === 0 && <tr><td colSpan={11} className="mst-empty">No purchases.</td></tr>}
                    {sec('purchase').rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.prno}</td><td>{r.invno}</td><td>{r.date}</td><td>{r.supplier}</td><td className="num">{n(r.qty)}</td><td className="num">{n(r.free)}</td><td className="num">{n(r.rate)}</td><td className="num">{n(r.mrp)}</td><td className="num">{n(r.netamt)}</td><td>{r.user}</td></tr>)}
                  </tbody>
                </table>
              )}
              {tab === 'purchaseReturn' && (
                <table className="mst-table">
                  <thead><tr><th>#</th><th>Return No</th><th>Date</th><th>Supplier</th><th className="num">Qty</th><th className="num">Rate</th><th className="num">Total</th><th>Notes</th><th>User</th></tr></thead>
                  <tbody>
                    {sec('purchaseReturn').rows.length === 0 && <tr><td colSpan={9} className="mst-empty">No purchase returns.</td></tr>}
                    {sec('purchaseReturn').rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.returnNo}</td><td>{r.date}</td><td>{r.supplier}</td><td className="num">{n(r.qty)}</td><td className="num">{n(r.rate)}</td><td className="num">{n(r.total)}</td><td>{r.notes}</td><td>{r.user}</td></tr>)}
                  </tbody>
                </table>
              )}
              {tab === 'exchange' && (
                <table className="mst-table">
                  <thead><tr><th>#</th><th>Bill</th><th>Date</th><th>Customer</th><th>Old Product</th><th>New Product</th><th>Direction</th><th>User</th></tr></thead>
                  <tbody>
                    {sec('exchange').rows.length === 0 && <tr><td colSpan={8} className="mst-empty">No exchanges.</td></tr>}
                    {sec('exchange').rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.bill}</td><td>{r.date}</td><td>{r.cus}</td><td>{r.oldProd}</td><td>{r.newProd}</td><td>{r.direction}</td><td>{r.user}</td></tr>)}
                  </tbody>
                </table>
              )}
              {tab === 'cancelled' && (
                <table className="mst-table">
                  <thead><tr><th>#</th><th>Bill</th><th>Date</th><th>Customer</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Total</th><th>Type</th><th>User</th></tr></thead>
                  <tbody>
                    {sec('cancelled').rows.length === 0 && <tr><td colSpan={9} className="mst-empty">No cancellations.</td></tr>}
                    {sec('cancelled').rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.bill}</td><td>{r.date}</td><td>{r.cus}</td><td className="num">{n(r.qty)}</td><td className="num">{n(r.price)}</td><td className="num">{n(r.total)}</td><td>{r.cancelType}</td><td>{r.user}</td></tr>)}
                  </tbody>
                </table>
              )}
              {tab === 'stockAdj' && (
                <table className="mst-table">
                  <thead><tr><th>#</th><th>Date</th><th>Time</th><th>Action</th><th className="num">Stock</th><th>Notes</th><th>User</th></tr></thead>
                  <tbody>
                    {sec('stockAdj').rows.length === 0 && <tr><td colSpan={7} className="mst-empty">No stock adjustments.</td></tr>}
                    {sec('stockAdj').rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.date}</td><td>{r.time}</td><td>{adjLabel(String(r.stockType))}</td><td className="num">{n(r.stock)} {r.unit}</td><td>{r.notes}</td><td>{r.user}</td></tr>)}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductAnalysisPage;
