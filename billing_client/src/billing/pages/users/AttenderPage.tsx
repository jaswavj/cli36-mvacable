import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { usersApi, usersData, usersError } from '../../../api/users/users-api-service';
import '../master/Master.css';

type Attender = { id: number; name: string; code: string; isActive: number };

const empty = { id: 0, name: '', code: '' };

const AttenderPage: React.FC = () => {
  const [rows, setRows] = useState<Attender[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setRows(usersData<Attender[]>(await usersApi.attenders()) || []);
    } catch (err) {
      toast.error(usersError(err, 'Could not load attenders'));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning('Name is required');
      return;
    }
    setBusy(true);
    try {
      await usersApi.saveAttender({
        id: form.id || undefined,
        name: form.name.trim(),
        code: form.code.trim(),
      });
      toast.success(form.id ? 'Attender updated' : 'Attender added');
      setForm(empty);
      await refresh();
    } catch (err) {
      toast.error(usersError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = async (row: Attender) => {
    const next = row.isActive === 1 ? 'block' : 'unblock';
    if (!window.confirm(next === 'block' ? 'Block this attender?' : 'Unblock this attender?')) return;
    try {
      if (next === 'block') await usersApi.blockAttender(row.id);
      else await usersApi.unblockAttender(row.id);
      toast.success(next === 'block' ? 'Attender blocked' : 'Attender unblocked');
      await refresh();
    } catch (err) {
      toast.error(usersError(err, 'Update failed'));
    }
  };

  const filtered = rows.filter((r) =>
    [r.name, r.code].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-user-tie" /> Attender Management</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-h">{form.id ? 'Edit Attender' : 'Add Attender'}</div>
        <form className="mst-card-b mst-form" onSubmit={onSubmit}>
          <div className="mst-fg">
            <label>Name <span className="req">*</span></label>
            <input className="mst-inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>Code</label>
            <input className="mst-inp" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="submit" disabled={busy}>{form.id ? 'Update' : 'Add Attender'}</button>
            {form.id > 0 && (
              <button className="mst-btn mst-btn-outline" type="button" onClick={() => setForm(empty)}>Cancel</button>
            )}
          </div>
        </form>
      </div>
      <div className="mst-card">
        <div className="mst-card-h">
          <span>Attender List</span>
          <div className="mst-search">
            <i className="fas fa-search" />
            <input className="mst-inp" placeholder="Search attenders..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="mst-table-wrap">
          <table className="mst-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Code</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="mst-empty">No attenders found</td></tr>
              ) : (
                filtered.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.name}</td>
                    <td>{row.code || '—'}</td>
                    <td>
                      <span className={`mst-badge ${row.isActive === 1 ? 'on' : 'off'}`}>
                        {row.isActive === 1 ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td>
                      <button className="mst-icon-btn" type="button" onClick={() => setForm({ id: row.id, name: row.name, code: row.code || '' })}>
                        <i className="fas fa-edit" /> Edit
                      </button>
                      <button className={`mst-icon-btn ${row.isActive === 1 ? 'danger' : ''}`} type="button" onClick={() => toggleBlock(row)}>
                        <i className={`fas ${row.isActive === 1 ? 'fa-ban' : 'fa-check'}`} /> {row.isActive === 1 ? 'Block' : 'Unblock'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttenderPage;
