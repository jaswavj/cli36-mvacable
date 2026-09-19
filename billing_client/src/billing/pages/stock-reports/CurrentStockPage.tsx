import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { stockApi, stockData, stockError } from '../../../api/stock-reports/stock-report-api-service';
import { masterApi, masterData } from '../../../api/master/master-api-service';
import '../master/Master.css';

type Row = {
  productName: string; code: string; stock: number; cost: number; mrp: number; discount: number;
  totalCost: number; totalMrp: number; unit: string; categoryId: number; categoryName: string;
};
type Cat = { id: number; name: string };

const n = (v?: number) => Number(v || 0).toFixed(3);

const CurrentStockPage: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [catId, setCatId] = useState('0');

  useEffect(() => {
    stockApi.currentStock().then((res) => setRows(stockData<Row[]>(res) || [])).catch((err) => toast.error(stockError(err, 'Could not load stock')));
    masterApi.categories().then((res) => setCats(masterData<Cat[]>(res) || [])).catch(() => undefined);
  }, []);

  const filtered = catId === '0' ? rows : rows.filter((r) => String(r.categoryId) === catId);
  const totalCost = filtered.reduce((s, r) => s + (r.totalCost || 0), 0);
  const totalMrp = filtered.reduce((s, r) => s + (r.totalMrp || 0), 0);

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-boxes" /> Current Stock</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg">
            <label>Category</label>
            <select className="mst-sel" value={catId} onChange={(e) => setCatId(e.target.value)}>
              <option value="0">All Categories</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="mst-card">
        <div className="mst-table-wrap">
          <table className="mst-table">
            <thead>
              <tr>
                <th>#</th><th>Product</th><th>Code</th><th className="num">Stock</th>
                <th className="num">Cost</th><th className="num">MRP</th>
                <th className="num">Total Cost</th><th className="num">Total MRP</th><th className="num">Discount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="mst-empty">No stock data found.</td></tr>}
              {filtered.map((row, i) => (
                <tr key={`${row.code}-${i}`}>
                  <td>{i + 1}</td>
                  <td>{row.productName}<div className="mst-note">{row.categoryName}</div></td>
                  <td>{row.code}</td>
                  <td className="num">{row.stock} {row.unit}</td>
                  <td className="num">{n(row.cost)}</td>
                  <td className="num">{n(row.mrp)}</td>
                  <td className="num">{n(row.totalCost)}</td>
                  <td className="num">{n(row.totalMrp)}</td>
                  <td className="num">{n(row.discount)}</td>
                </tr>
              ))}
              {filtered.length > 0 && (
                <tr>
                  <td colSpan={6}><strong>Total Value</strong></td>
                  <td className="num"><strong>₹ {n(totalCost)}</strong></td>
                  <td className="num"><strong>₹ {n(totalMrp)}</strong></td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CurrentStockPage;
