import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { stockApi, stockData, stockError } from '../../../api/stock-reports/stock-report-api-service';
import '../master/Master.css';
import '../statistics/Stats.css';

type Prod = { id: number; name: string };
type Row = { productName: string; stockIn: number; stockOut: number; stockNow: number; notes: string; dateTime: string; userName: string; adjType: number; unit: string };

const today = () => new Date().toISOString().slice(0, 10);

const ProductTransactionPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [productId, setProductId] = useState('0');
  const [products, setProducts] = useState<Prod[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    stockApi.products().then((res) => setProducts(stockData<Prod[]>(res) || [])).catch(() => undefined);
  }, []);

  const search = async () => {
    try {
      setRows(stockData<Row[]>(await stockApi.transactions(from, to, productId === '0' ? undefined : Number(productId))) || []);
    } catch (err) {
      toast.error(stockError(err, 'Could not load report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-exchange-alt" /> Product Transaction</h2>
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
                <tr>
                  <th>#</th><th>Product</th><th className="num">Stock in</th><th className="num">Stock out</th>
                  <th className="num">Stock now</th><th>Notes</th><th>Date/Time</th><th>Stock Adj</th><th>User</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={9} className="mst-empty">No transactions.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={`${row.dateTime}-${i}`}>
                    <td>{i + 1}</td>
                    <td>{row.productName}</td>
                    <td className={`num ${row.stockIn > 0 ? 'st-in' : ''}`}>{row.stockIn} {row.unit}</td>
                    <td className={`num ${row.stockOut > 0 ? 'st-out' : ''}`}>{row.stockOut} {row.unit}</td>
                    <td className="num">{row.stockNow} {row.unit}</td>
                    <td>{row.notes}</td>
                    <td>{row.dateTime}</td>
                    <td>{row.adjType === 1 ? 'Added' : row.adjType === 2 ? 'Removed' : '—'}</td>
                    <td>{row.userName}</td>
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

export default ProductTransactionPage;
