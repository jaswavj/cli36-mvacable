import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { inventoryApi, invData, invError } from '../../../api/inventory/inventory-api-service';
import '../master/Master.css';

type Supplier = { id: number; name: string };
type Row = {
  id: number;
  returnNo: string;
  purchaseId: number;
  prno: string;
  supplierName: string;
  total: number;
  notes: string;
  dateTime: string;
  enteredBy: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const PurchaseReturnReportPage: React.FC = () => {
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
      setRows(invData<Row[]>(await inventoryApi.returnReport(from, to, supplierId === '0' ? undefined : Number(supplierId))) || []);
    } catch (err) {
      toast.error(invError(err, 'Could not load report'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-chart-line" /> Purchase Return Report
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
            <button className="mst-btn mst-btn-primary" type="button" onClick={search}>Generate</button>
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
                  <th>Return No</th>
                  <th>GR No</th>
                  <th>Supplier</th>
                  <th className="num">Total</th>
                  <th>Notes</th>
                  <th>Date</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={8} className="mst-empty">No returns in this period.</td></tr>}
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.returnNo}</td>
                    <td>{row.prno}</td>
                    <td>{row.supplierName}</td>
                    <td className="num">{Number(row.total || 0).toFixed(2)}</td>
                    <td>{row.notes}</td>
                    <td>{row.dateTime}</td>
                    <td>{row.enteredBy}</td>
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

export default PurchaseReturnReportPage;
