import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { masterApi, masterData, masterError } from '../../../api/master/master-api-service';
import './Master.css';

type Unit = {
  id: number;
  name: string;
  convertionUnit: string;
  convertionCalculation: number | null;
  isActive: number;
};

const empty = { id: 0, name: '', convertionUnit: '', convertionCalculation: '' };

const UnitsPage: React.FC = () => {
  const [rows, setRows] = useState<Unit[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setRows(masterData<Unit[]>(await masterApi.units()) || []);
    } catch (err) {
      toast.error(masterError(err, 'Could not load units'));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning('Unit name is required');
      return;
    }
    setBusy(true);
    try {
      await masterApi.saveUnit({
        id: form.id || undefined,
        name: form.name.trim(),
        convertionUnit: form.convertionUnit,
        convertionCalculation: form.convertionCalculation === '' ? null : Number(form.convertionCalculation),
      });
      toast.success(form.id ? 'Unit updated' : 'Unit added');
      setForm(empty);
      await refresh();
    } catch (err) {
      toast.error(masterError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (row: Unit) => {
    try {
      await masterApi.unitStatus(row.id, row.isActive === 1 ? 0 : 1);
      toast.info(row.isActive === 1 ? 'Unit blocked' : 'Unit unblocked');
      await refresh();
    } catch (err) {
      toast.error(masterError(err, 'Status update failed'));
    }
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-balance-scale" /> Units
      </h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-h">Add / Edit Unit</div>
        <form className="mst-card-b mst-form" onSubmit={onSubmit}>
          <div className="mst-fg">
            <label>Unit Name <span className="req">*</span></label>
            <input className="mst-inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>Convertion Unit Name</label>
            <input className="mst-inp" value={form.convertionUnit} onChange={(e) => setForm({ ...form, convertionUnit: e.target.value })} />
          </div>
          <div className="mst-fg span-2">
            <label>Convertion Calculation</label>
            <input
              className="mst-inp"
              type="number"
              step="0.01"
              min="0"
              value={form.convertionCalculation}
              onChange={(e) => setForm({ ...form, convertionCalculation: e.target.value })}
            />
            <span className="mst-note">How many conversion units per base unit.</span>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">
              {form.id ? 'Update Unit' : 'Add Unit'}
            </button>
            {form.id > 0 && (
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setForm(empty)}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="mst-card">
        <div className="mst-card-h">
          <span>Units List</span>
          <div className="mst-search">
            <i className="fas fa-search" />
            <input className="mst-inp" placeholder="Search units..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="mst-table-wrap">
          <table className="mst-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Convertion Unit</th>
                <th>Convertion Calculation</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id}>
                  <td>{i + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.convertionUnit || '-'}</td>
                  <td>{row.convertionCalculation ?? '-'}</td>
                  <td>
                    <span className={`mst-badge ${row.isActive === 1 ? 'on' : 'off'}`}>{row.isActive === 1 ? 'Active' : 'Blocked'}</span>
                  </td>
                  <td>
                    <button className="mst-icon-btn" type="button" onClick={() => setForm({
                      id: row.id,
                      name: row.name,
                      convertionUnit: row.convertionUnit || '',
                      convertionCalculation: row.convertionCalculation == null ? '' : String(row.convertionCalculation),
                    })}>
                      <i className="fas fa-edit" />
                    </button>
                    <button className="mst-icon-btn danger" type="button" onClick={() => toggle(row)}>
                      <i className={`fas ${row.isActive === 1 ? 'fa-ban' : 'fa-check'}`} />
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

export default UnitsPage;
