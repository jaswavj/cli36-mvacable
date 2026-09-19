import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { inventoryApi, invData, invError } from '../../../api/inventory/inventory-api-service';
import '../master/Master.css';

type Supplier = { id: number; name: string };
type Row = {
  id: number;
  date: string;
  prno: string;
  supplierName: string;
  total: number;
  paid: number;
  balance: number;
};

const today = () => new Date().toISOString().slice(0, 10);

const SupplierPaymentReportPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [supplierId, setSupplierId] = useState('0');
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    inventoryApi.suppliers().then((res) => setSuppliers(invData<Supplier[]>(res) || [])).catch(() => undefined);
  }, []);

  const search = async () => {
    try {
      setRows(invData<Row[]>(await inventoryApi.paymentReport(from, to, supplierId === '0' ? undefined : Number(supplierId))) || []);
    } catch (err) {
      toast.error(invError(err, 'Could not load report'));
    }
  };

  const totals = useMemo(() => {
    if (!rows) return { total: 0, paid: 0, balance: 0 };
    return rows.reduce(
      (acc, r) => {
        acc.total += Number(r.total || 0);
        acc.paid += Number(r.paid || 0);
        acc.balance += Number(r.balance || 0);
        return acc;
      },
      { total: 0, paid: 0, balance: 0 }
    );
  }, [rows]);

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-money-check" /> Supplier Payment Report
      </h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg">
            <label>From Date</label>
            <input className="mst-inp" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>To Date</label>
            <input className="mst-inp" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>Supplier</label>
            <select className="mst-sel" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="0">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate Report</button>
          </div>
        </div>
      </div>
      {rows && (
        <div className="mst-card">
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date</th>
                  <th>PR No</th>
                  <th>Supplier Name</th>
                  <th className="num">Total Amount</th>
                  <th className="num">Paid Amount</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={7} className="mst-empty">No payments in this period.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.date}</td>
                    <td>{row.prno}</td>
                    <td>{row.supplierName}</td>
                    <td className="num">{Number(row.total || 0).toFixed(2)}</td>
                    <td className="num">{Number(row.paid || 0).toFixed(2)}</td>
                    <td className="num">{Number(row.balance || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4}><b>Total</b></td>
                    <td className="num"><b>{totals.total.toFixed(2)}</b></td>
                    <td className="num"><b>{totals.paid.toFixed(2)}</b></td>
                    <td className="num"><b>{totals.balance.toFixed(2)}</b></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierPaymentReportPage;
