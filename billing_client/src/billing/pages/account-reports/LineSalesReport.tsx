import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { accountData, accountError } from '../../../api/account-reports/account-report-api-service';
import '../master/Master.css';
import { n3, sum, today } from './reportHelpers';
import { useBillDetail } from './BillDetailModal';

type Opt = { id: number; name: string };
type Row = {
  billNo: string; customer: string; qty: number; price: number; discount: number; total: number;
  paid: number; balance: number; pendingBalance: number; productName: string; categoryName: string;
  brandName: string; date: string; time: string; biller: string;
};

type Props = {
  title: string;
  icon: string;
  filterLabel: string;
  loadOptions: () => Promise<any>;
  searchRows: (from: string, to: string, id: number) => Promise<any>;
};

const LineSalesReport: React.FC<Props> = ({ title, icon, filterLabel, loadOptions, searchRows }) => {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [id, setId] = useState('');
  const [options, setOptions] = useState<Opt[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const { openBill, billModal } = useBillDetail();

  useEffect(() => {
    loadOptions().then((res) => setOptions(accountData<Opt[]>(res) || [])).catch(() => undefined);
  }, [loadOptions]);

  const search = async () => {
    if (!id) {
      toast.error(`Please select a ${filterLabel.toLowerCase()}`);
      return;
    }
    try {
      setRows(accountData<Row[]>(await searchRows(from, to, Number(id))) || []);
    } catch (err) {
      toast.error(accountError(err, 'Could not load report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className={icon} /> {title}</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg"><label>From Date</label><input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="mst-fg"><label>To Date</label><input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="mst-fg">
            <label>{filterLabel}</label>
            <select className="mst-sel" value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">Select {filterLabel}</option>
              {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div className="mst-actions"><button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate Report</button></div>
        </div>
      </div>
      {rows && (
        <div className="mst-card">
          <div className="mst-card-h">{from} — {to}</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th><th>Bill No</th><th>Customer</th><th className="num">Qty</th><th className="num">Price</th>
                  <th className="num">Discount</th><th className="num">Total</th><th className="num">Paid</th>
                  <th className="num">Balance</th><th className="num">Pending</th><th>Category</th><th>Brand</th>
                  <th>Date</th><th>Time</th><th>Biller</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={15} className="mst-empty">No records.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={`${row.billNo}-${i}`} className="mst-click-row" onClick={() => openBill(row.billNo)}>
                    <td>{i + 1}</td>
                    <td>{row.billNo}<div className="mst-note">{row.productName}</div></td>
                    <td>{row.customer}</td>
                    <td className="num">{n3(row.qty)}</td>
                    <td className="num">{n3(row.price)}</td>
                    <td className="num">{n3(row.discount)}</td>
                    <td className="num">{n3(row.total)}</td>
                    <td className="num">{n3(row.paid)}</td>
                    <td className="num">{n3(row.balance)}</td>
                    <td className="num">{n3(row.pendingBalance)}</td>
                    <td>{row.categoryName}</td>
                    <td>{row.brandName}</td>
                    <td>{row.date}</td>
                    <td>{row.time}</td>
                    <td>{row.biller}</td>
                  </tr>
                ))}
                {rows.length > 0 && (
                  <tr>
                    <td colSpan={6}><strong>Grand Total</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'total'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'paid'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'balance'))}</strong></td>
                    <td className="num"><strong>{n3(sum(rows, 'pendingBalance'))}</strong></td>
                    <td colSpan={5} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {billModal}
    </div>
  );
};

export default LineSalesReport;
