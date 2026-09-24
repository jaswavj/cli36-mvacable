import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { stockApi, stockData, stockError, type StockProduct } from '../../../api/stock/stock-api-service';
import '../master/Master.css';
import '../customer/Customer.css';
import './Stock.css';

const empty = { id: 0, name: '', rate: '', notes: '' };
const show = (v?: string) => (v && v.trim() ? v : '—');
const n = (v?: number) => Number(v || 0).toFixed(2);

const StockProductPage: React.FC = () => {
  const [rows, setRows] = useState<StockProduct[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setRows(stockData<StockProduct[]>(await stockApi.products()) || []);
    } catch (err) {
      toast.error(stockError(err, 'Could not load products'));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const reset = () => setForm(empty);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning('Product name is required');
      return;
    }
    const rate = Number(form.rate);
    if (!Number.isFinite(rate) || rate < 0) {
      toast.warning('Enter a valid rate');
      return;
    }
    setBusy(true);
    try {
      await stockApi.saveProduct({
        id: form.id || undefined,
        name: form.name.trim(),
        rate,
        notes: form.notes.trim(),
      });
      toast.success(form.id ? 'Product updated' : 'Product added');
      reset();
      await refresh();
    } catch (err) {
      toast.error(stockError(err, 'Could not save product'));
    } finally {
      setBusy(false);
    }
  };

  const list = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${row.name || ''} ${row.notes || ''}`.toLowerCase().includes(q);
  });

  return (
    <div className="mst-page">
      <div className="trp-head">
        <div className="trp-head-icon">
          <i className="fas fa-box" />
        </div>
        <div>
          <h2 className="mst-title">Add Product</h2>
          <p className="trp-sub">Create products with rate and notes</p>
        </div>
      </div>

      <div className="mst-grid cust-add-grid">
        <div className="mst-card">
          <div className="mst-card-h">
            <span>
              <i className={form.id ? 'fas fa-pen' : 'fas fa-plus-circle'} /> {form.id ? 'Edit Product' : 'New Product'}
            </span>
          </div>
          <form className="mst-card-b mst-form one-col" onSubmit={onSubmit}>
            <div className="mst-fg">
              <label>
                Product <span className="req">*</span>
              </label>
              <input
                className="mst-inp"
                placeholder="Product name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="mst-fg">
              <label>
                Rate <span className="req">*</span>
              </label>
              <input
                className="mst-inp"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
              />
            </div>
            <div className="mst-fg">
              <label>Notes</label>
              <textarea
                className="mst-area"
                rows={3}
                placeholder="Optional notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="mst-actions">
              <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">
                <i className="fas fa-save" /> {form.id ? 'Update' : 'Add Product'}
              </button>
              {form.id > 0 && (
                <button className="mst-btn mst-btn-outline" type="button" onClick={reset}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="mst-card">
          <div className="mst-card-h">
            <span className="trp-list-title">
              <i className="fas fa-list" /> Products
              <em className="trp-count">{list.length}</em>
            </span>
            <div className="mst-search">
              <i className="fas fa-search" />
              <input
                className="mst-inp"
                placeholder="Search product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="mst-table-wrap stk-fit-wrap">
            <table className="mst-table trp-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num" style={{ width: '22%' }}>Rate</th>
                  <th className="num" style={{ width: '16%' }}>Stock</th>
                  <th>Notes</th>
                  <th style={{ width: 44 }}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="mst-empty">
                      <i className="fas fa-box" />
                      <div>No products yet</div>
                    </td>
                  </tr>
                )}
                {list.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td className="num">₹ {n(row.rate)}</td>
                    <td className="num">{Number(row.qty || 0)}</td>
                    <td>{show(row.notes)}</td>
                    <td>
                      <button
                        className="mst-icon-btn"
                        type="button"
                        title="Edit"
                        onClick={() =>
                          setForm({
                            id: row.id,
                            name: row.name || '',
                            rate: String(row.rate ?? ''),
                            notes: row.notes || '',
                          })
                        }
                      >
                        <i className="fas fa-edit" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockProductPage;
