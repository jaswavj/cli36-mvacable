import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { accountApi, accountData, accountError } from '../../../api/account-reports/account-report-api-service';
import '../master/Master.css';
import '../statistics/Stats.css';
import { n2, today } from './reportHelpers';
import { useBillDetail } from './BillDetailModal';

type Cat = { id: number; name: string; amount: number };
type Data = {
  categories: Cat[];
  collectionTotal: number;
  payments: { cash: number; bank: number; discount: number; due: number; total: number };
  dueCollections: { cash: number; bank: number; total: number };
  difference: number;
  details?: any[];
};

type Detail = {
  billNo: string; customer: string; qty: number; price: number; discount: number; total: number;
  paid: number; date: string; time: string; productName: string;
};

const DayAccountPage: React.FC = () => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [data, setData] = useState<Data | null>(null);
  const [details, setDetails] = useState<Detail[] | null>(null);
  const [detailName, setDetailName] = useState('');
  const { openBill, billModal } = useBillDetail();

  const search = async () => {
    try {
      setData(accountData<Data>(await accountApi.dayAccount(from, to)));
      setDetails(null);
    } catch (err) {
      toast.error(accountError(err, 'Could not load day account'));
    }
  };

  const openDetails = async (cat: Cat) => {
    try {
      setDetailName(cat.name);
      setDetails(accountData<Detail[]>(await accountApi.salesByCategory(from, to, cat.id)) || []);
    } catch (err) {
      toast.error(accountError(err, 'Could not load category details'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-calendar-day" /> Day Account</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-actions"><button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate Report</button></div>
        </div>
      </div>
      {data && (
        <>
          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-h">Category Collection {from} — {to}</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead><tr><th>Category Name</th><th className="num">Collection</th></tr></thead>
                <tbody>
                  {data.categories.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td className="num">
                        <button type="button" className="mst-btn mst-btn-outline" style={{ padding: '2px 8px' }} onClick={() => openDetails(c)}>
                          {n2(c.amount)}
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr><td><strong>Collection Total</strong></td><td className="num"><strong>{n2(data.collectionTotal)}</strong></td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-h">Payment Method</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead><tr><th>Payment Method</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  <tr><td>Cash</td><td className="num">{n2(data.payments.cash)}</td></tr>
                  <tr><td>Bank</td><td className="num">{n2(data.payments.bank)}</td></tr>
                  <tr><td>Discount</td><td className="num">{n2(data.payments.discount)}</td></tr>
                  <tr><td>Due</td><td className="num">{n2(data.payments.due)}</td></tr>
                  <tr><td><strong>Total</strong></td><td className="num"><strong>{n2(data.payments.total)}</strong></td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-h">Due Collection</div>
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead><tr><th>Due Collection</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  <tr><td>Cash</td><td className="num">{n2(data.dueCollections.cash)}</td></tr>
                  <tr><td>Bank</td><td className="num">{n2(data.dueCollections.bank)}</td></tr>
                  <tr><td><strong>Total</strong></td><td className="num"><strong>{n2(data.dueCollections.total)}</strong></td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-b"><strong>Total Difference:</strong> {n2(data.difference)}</div>
          </div>
          {details && (
            <div className="mst-card">
              <div className="mst-card-h">{detailName} details</div>
              <div className="mst-table-wrap">
                <table className="mst-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Bill No</th><th>Customer</th><th>Product</th>
                      <th className="num">Qty</th><th className="num">Price</th><th className="num">Discount</th>
                      <th className="num">Total</th><th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.length === 0 && <tr><td colSpan={9} className="mst-empty">No line items.</td></tr>}
                    {details.map((row, i) => (
                      <tr key={`${row.billNo}-${i}`} className="mst-click-row" onClick={() => openBill(row.billNo)}>
                        <td>{i + 1}</td>
                        <td>{row.billNo}</td>
                        <td>{row.customer}</td>
                        <td>{row.productName}</td>
                        <td className="num">{n2(row.qty)}</td>
                        <td className="num">{n2(row.price)}</td>
                        <td className="num">{n2(row.discount)}</td>
                        <td className="num">{n2(row.total)}</td>
                        <td>{row.date} {row.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      {billModal}
    </div>
  );
};

export default DayAccountPage;
