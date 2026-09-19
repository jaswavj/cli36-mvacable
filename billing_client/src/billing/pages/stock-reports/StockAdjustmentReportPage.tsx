import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { stockApi, stockData, stockError } from '../../../api/stock-reports/stock-report-api-service';
import '../master/Master.css';
import '../statistics/Stats.css';

type Prod = { id: number; name: string };
type Row = { id: number; productName: string; stockType: number; stock: number; date: string; time: string; notes: string; userName: string; unit: string };

const today = () => new Date().toISOString().slice(0, 10);

const label = (t: number) => (t === 1 ? 'Added' : t === 3 ? 'Damage' : t === 4 ? 'Internal Use' : 'Removed');
const badge = (t: number) => (t === 1 ? 'add' : t === 3 ? 'warn' : t === 4 ? 'info' : 'remove');

const StockAdjustmentReportPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [productId, setProductId] = useState('0');
  const [stockType, setStockType] = useState('0');
  const [products, setProducts] = useState<Prod[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    stockApi.products().then((res) => setProducts(stockData<Prod[]>(res) || [])).catch(() => undefined);
  }, []);

  const search = async () => {
    try {
      setRows(stockData<Row[]>(await stockApi.adjustments(
        from, to,
        productId === '0' ? undefined : Number(productId),
        stockType === '0' ? undefined : Number(stockType),
      )) || []);
    } catch (err) {
      toast.error(stockError(err, 'Could not load report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-sliders-h" /> Stock Adjustment</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Product</label>
            <select className="mst-sel" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="0">-- All Products --</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="mst-fg">
            <label>Stock Type</label>
            <select className="mst-sel" value={stockType} onChange={(e) => setStockType(e.target.value)}>
              <option value="0">-- All Types --</option>
              <option value="1">Stock Add</option>
              <option value="2">Stock Remove</option>
              <option value="3">Damage</option>
              <option value="4">Internal Use</option>
            </select>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate Report</button>
          </div>
        </div>
      </div>
      {rows && (
        <div className="mst-card">
          <div className="mst-card-h">Period: {from} to {to}</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr><th>#</th><th>Product</th><th>Action</th><th className="num">Stock</th><th>Date</th><th>Time</th><th>User</th><th>Notes</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={8} className="mst-empty">No adjustments.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.productName}</td>
                    <td><span className={`st-badge ${badge(row.stockType)}`}>{label(row.stockType)}</span></td>
                    <td className="num">{row.stock} {row.unit}</td>
                    <td>{row.date}</td>
                    <td>{row.time}</td>
                    <td>{row.userName}</td>
                    <td>{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAdjustmentReportPage;
