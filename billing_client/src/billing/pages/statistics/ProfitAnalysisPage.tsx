import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { statsApi, statsData, statsError } from '../../../api/statistics/statistics-api-service';
import '../master/Master.css';
import '../credit/Credit.css';
import './Stats.css';

type Row = {
  billNo: string; date: string; customer?: string; productName?: string; qty?: number;
  costPrice?: number; cost: number; sale: number; profit: number; margin: number;
};

const today = () => new Date().toISOString().slice(0, 10);
const n = (v?: number) => Number(v || 0).toFixed(2);

const ProfitAnalysisPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [type, setType] = useState('product');
  const [data, setData] = useState<any>(null);

  const search = async () => {
    try {
      setData(statsData(await statsApi.profit(from, to, type)));
    } catch (err) {
      toast.error(statsError(err, 'Could not load report'));
    }
  };

  const billWise = data?.type === 'bill';
  const rows: Row[] = data?.rows || [];

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-chart-pie" /> Profit Analysis Report</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>Report Type</label>
            <select className="mst-sel" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="product">Product-wise Profit</option>
              <option value="bill">Bill-wise Profit / Loss</option>
            </select>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate Report</button>
          </div>
        </div>
      </div>
      {data && (
        <>
          <div className="st-kpis">
            <div className="mst-card crd-stat"><div className="crd-stat-l">Total Cost</div><div className="crd-stat-v">₹ {n(data.totalCost)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Total Sales</div><div className="crd-stat-v">₹ {n(data.totalSale)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Total Profit</div><div className={`crd-stat-v ${data.totalProfit >= 0 ? 'ok' : 'due'}`}>₹ {n(data.totalProfit)}</div></div>
            <div className="mst-card crd-stat"><div className="crd-stat-l">Profit Margin</div><div className={`crd-stat-v ${data.marginPct >= 0 ? 'ok' : 'due'}`}>{Number(data.marginPct || 0).toFixed(1)}%</div></div>
          </div>
          <div className="mst-card">
            <div className="mst-card-h">{from} — {to} | {billWise ? 'Bill-wise' : 'Product-wise'}</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  {billWise ? (
                    <tr><th>#</th><th>Bill No</th><th>Customer</th><th>Date</th><th className="num">Total Cost</th><th className="num">Payable</th><th className="num">Profit / Loss</th><th className="num">Margin %</th></tr>
                  ) : (
                    <tr><th>#</th><th>Bill No</th><th>Product</th><th className="num">Qty</th><th className="num">Cost Price</th><th className="num">Total Cost</th><th className="num">Sale Total</th><th className="num">Profit</th><th className="num">Profit %</th><th>Date</th></tr>
                  )}
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={billWise ? 8 : 10} className="mst-empty">No records.</td></tr>}
                  {rows.map((row, i) => (
                    <tr key={`${row.billNo}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{row.billNo}</td>
                      {billWise ? (
                        <>
                          <td>{row.customer}</td>
                          <td>{row.date}</td>
                          <td className="num">₹ {n(row.cost)}</td>
                          <td className="num">₹ {n(row.sale)}</td>
                          <td className={`num ${row.profit >= 0 ? 'st-pos' : 'st-neg'}`}>₹ {n(row.profit)}</td>
                          <td className={`num ${row.margin >= 0 ? 'st-pos' : 'st-neg'}`}>{Number(row.margin).toFixed(1)}%</td>
                        </>
                      ) : (
                        <>
                          <td>{row.productName}</td>
                          <td className="num">{row.qty}</td>
                          <td className="num">₹ {n(row.costPrice)}</td>
                          <td className="num">₹ {n(row.cost)}</td>
                          <td className="num">₹ {n(row.sale)}</td>
                          <td className={`num ${row.profit >= 0 ? 'st-pos' : 'st-neg'}`}>₹ {n(row.profit)}</td>
                          <td className={`num ${row.margin >= 0 ? 'st-pos' : 'st-neg'}`}>{Number(row.margin).toFixed(1)}%</td>
                          <td>{row.date}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProfitAnalysisPage;
