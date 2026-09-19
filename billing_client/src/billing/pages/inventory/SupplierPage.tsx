import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { inventoryApi, invData, invError } from '../../../api/inventory/inventory-api-service';
import '../master/Master.css';

type Supplier = {
  id: number;
  name: string;
  description: string;
  phone: string;
  gstin: string;
  isGst: number;
};

const empty = { id: 0, name: '', phone: '', description: '', gstin: '', isGst: 0, blockIt: false };

const SupplierPage: React.FC = () => {
  const [rows, setRows] = useState<Supplier[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setRows(invData<Supplier[]>(await inventoryApi.suppliers()) || []);
    } catch (err) {
      toast.error(invError(err, 'Could not load suppliers'));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning('Supplier name is required');
      return;
    }
    if (form.isGst && form.gstin.trim().length !== 15) {
      toast.warning('GSTIN must be exactly 15 characters');
      return;
    }
    setBusy(true);
    try {
      if (form.id && form.blockIt) {
        await inventoryApi.blockSupplier(form.id);
        toast.info('Supplier blocked');
      } else {
        await inventoryApi.saveSupplier({
          id: form.id || undefined,
          name: form.name.trim(),
          phone: form.phone,
          description: form.description,
          gstin: form.isGst ? form.gstin : '',
          isGst: form.isGst,
        });
        toast.success(form.id ? 'Supplier updated' : 'Supplier added successfully');
      }
      setForm(empty);
      await refresh();
    } catch (err) {
      toast.error(invError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const filtered = rows.filter((r) =>
    [r.name, r.phone, r.gstin, r.description].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-truck" /> Suppliers
      </h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-h">{form.id ? 'Edit Supplier' : 'Add Supplier'}</div>
        <form className="mst-card-b mst-form" onSubmit={onSubmit}>
          <div className="mst-fg">
            <label>Supplier Name <span className="req">*</span></label>
            <input className="mst-inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>Phone Number</label>
            <input className="mst-inp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="mst-fg span-2">
            <label>Address</label>
            <textarea className="mst-area" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <label className="mst-check">
            <input type="checkbox" checked={form.isGst === 1} onChange={(e) => setForm({ ...form, isGst: e.target.checked ? 1 : 0, gstin: e.target.checked ? form.gstin : '' })} />
            GST Registered
          </label>
          <div className="mst-fg">
            <label>GSTIN {form.isGst === 1 && <span className="req">*</span>}</label>
            <input className="mst-inp" maxLength={15} disabled={form.isGst !== 1} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} />
          </div>
          {form.id > 0 && (
            <label className="mst-block mst-check">
              <input type="checkbox" checked={form.blockIt} onChange={(e) => setForm({ ...form, blockIt: e.target.checked })} />
              Block this supplier
            </label>
          )}
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">{form.id ? 'Update' : 'Add Supplier'}</button>
            {form.id > 0 && (
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setForm(empty)}>Cancel</button>
            )}
          </div>
        </form>
      </div>
      <div className="mst-card">
        <div className="mst-card-h">
          <span>Supplier List</span>
          <div className="mst-search">
            <i className="fas fa-search" />
            <input className="mst-inp" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="mst-table-wrap">
          <table className="mst-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Phone</th>
                <th>GST Status</th>
                <th>GSTIN</th>
                <th>Address</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id}>
                  <td>{i + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.phone}</td>
                  <td>
                    <span className={`mst-badge ${row.isGst === 1 ? 'on' : 'off'}`}>
                      {row.isGst === 1 ? 'Registered' : 'Not Registered'}
                    </span>
                  </td>
                  <td>{row.gstin}</td>
                  <td>{row.description}</td>
                  <td>
                    <button
                      className="mst-icon-btn"
                      type="button"
                      onClick={() =>
                        setForm({
                          id: row.id,
                          name: row.name,
                          phone: row.phone === '-' ? '' : row.phone,
                          description: row.description === '-' ? '' : row.description,
                          gstin: row.gstin === '-' ? '' : row.gstin,
                          isGst: row.isGst,
                          blockIt: false,
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
  );
};

export default SupplierPage;
