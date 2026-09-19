import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { masterApi, masterData, masterError } from '../../../api/master/master-api-service';
import { useHeadings } from './useHeadings';
import './Master.css';

type StockRow = {
  id: number;
  name: string;
  code: string;
  categoryName: string;
  brandName: string;
  stock: number;
  batchId: number;
  unitName: string;
  convertionUnit: string;
  convertionCalculation: number;
};

const REASONS = ['Broken', 'Expired', 'Damaged in Transit', 'Quality Issue', 'Office Use', 'Sample/Demo', 'Staff Use', 'Testing', 'Other'];

const StockPage: React.FC = () => {
  const heads = useHeadings();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StockRow | null>(null);
  const [type, setType] = useState('');
  const [qty, setQty] = useState('0.00');
  const [reasonCategory, setReasonCategory] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setRows(masterData<StockRow[]>(await masterApi.stockProducts()) || []);
    } catch (err) {
      toast.error(masterError(err, 'Could not load stock'));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const displayStock = useMemo(() => {
    if (!selected) return '';
    if (selected.convertionCalculation > 0 && selected.convertionUnit) {
      return `${(selected.stock / selected.convertionCalculation).toFixed(3)} ${selected.convertionUnit}`;
    }
    return `${selected.stock} ${selected.unitName || ''}`.trim();
  }, [selected]);

  const onAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.warning('Select a product first');
      return;
    }
    if (!type) {
      toast.warning('Choose the type');
      return;
    }
    if (Number(qty) <= 0) {
      toast.warning('Quantity must be greater than 0');
      return;
    }
    if (!reason.trim()) {
      toast.warning('Reason is required');
      return;
    }
    setBusy(true);
    try {
      await masterApi.adjustStock({
        productId: selected.id,
        batchId: selected.batchId,
        type: Number(type),
        quantity: Number(qty),
        reason: reason.trim(),
        reasonCategory,
      });
      toast.success('Stock updated');
      setType('');
      setQty('0.00');
      setReason('');
      setReasonCategory('');
      setSelected(null);
      await refresh();
    } catch (err) {
      toast.error(masterError(err, 'Stock update failed'));
    } finally {
      setBusy(false);
    }
  };

  const filtered = rows.filter((r) =>
    [r.name, r.code, r.categoryName, r.brandName].join(' ').toLowerCase().includes(search.toLowerCase())
  );
  const showReasonCat = type === '3' || type === '4';

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-warehouse" /> Stock Management
      </h2>
      {selected && (
        <div className="mst-card" style={{ marginBottom: 12 }}>
          <div className="mst-card-h">Adjust Stock — {selected.name}</div>
          <form className="mst-card-b mst-form" onSubmit={onAdjust}>
            <div className="mst-fg">
              <label>Product Name</label>
              <input className="mst-inp" value={selected.name} disabled />
            </div>
            <div className="mst-fg">
              <label>Action Type</label>
              <select className="mst-sel" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">Choose The Type</option>
                <option value="1">Stock Add</option>
                <option value="2">Stock Remove</option>
                <option value="3">Damage</option>
                <option value="4">Internal Use</option>
              </select>
            </div>
            <div className="mst-fg">
              <label>Quantity{selected.unitName ? ` (${selected.unitName})` : ''}</label>
              <input className="mst-inp" type="number" step="0.01" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
              <span className="mst-note">Current stock: {displayStock}</span>
            </div>
            {showReasonCat && (
              <div className="mst-fg">
                <label>Reason Category</label>
                <select className="mst-sel" value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)}>
                  <option value="">-- Select Category --</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="mst-fg span-2">
              <label>Reason/Notes</label>
              <textarea className="mst-area" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Type the reason for edit stock" />
            </div>
            <div className="mst-actions">
              <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">Update</button>
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setSelected(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      <div className="mst-card">
        <div className="mst-card-h">
          <span>{heads.head3} List</span>
          <div className="mst-search">
            <i className="fas fa-search" />
            <input className="mst-inp" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="mst-table-wrap">
          <table className="mst-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Code</th>
                <th>{heads.head1}</th>
                <th>{heads.head2}</th>
                <th className="num">Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id} onClick={() => setSelected(row)} style={{ cursor: 'pointer' }}>
                  <td>{i + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.code}</td>
                  <td>{row.categoryName}</td>
                  <td>{row.brandName}</td>
                  <td className="num">{Number(row.stock || 0).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockPage;
