import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { masterApi, masterData, masterError } from '../../../api/master/master-api-service';
import './Master.css';

type TableRow = { id: number; name: string; isOccupied: number };

const CafeTablesPage: React.FC = () => {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(0);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setRows(masterData<TableRow[]>(await masterApi.tables()) || []);
    } catch (err) {
      toast.error(masterError(err, 'Could not load tables'));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Table name is required');
      return;
    }
    setBusy(true);
    try {
      await masterApi.saveTable({ id: editId || undefined, name: name.trim() });
      toast.success(editId ? 'Table updated' : 'Table added');
      setName('');
      setEditId(0);
      await refresh();
    } catch (err) {
      toast.error(masterError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Delete this table?')) return;
    try {
      await masterApi.deleteTable(id);
      toast.info('Table deleted');
      await refresh();
    } catch (err) {
      toast.error(masterError(err, 'Delete failed'));
    }
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-chair" /> Cafe Tables
      </h2>
      <div className="mst-grid">
        <div className="mst-card">
          <div className="mst-card-h">{editId ? 'Edit Table' : 'Add Table'}</div>
          <form className="mst-card-b mst-form one-col" onSubmit={onSubmit}>
            <div className="mst-fg">
              <label>Table Name <span className="req">*</span></label>
              <input className="mst-inp" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="mst-actions">
              <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">
                {editId ? 'Update' : 'Add Table'}
              </button>
              {editId > 0 && (
                <button className="mst-btn mst-btn-outline" type="button" onClick={() => { setEditId(0); setName(''); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="mst-card">
          <div className="mst-card-h">
            <span>Tables</span>
            <div className="mst-search">
              <i className="fas fa-search" />
              <input className="mst-inp" placeholder="Search tables..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.name}</td>
                    <td>
                      <span className={`mst-badge ${row.isOccupied === 1 ? 'off' : 'on'}`}>
                        {row.isOccupied === 1 ? 'Occupied' : 'Free'}
                      </span>
                    </td>
                    <td>
                      <button className="mst-icon-btn" type="button" onClick={() => { setEditId(row.id); setName(row.name); }}>
                        <i className="fas fa-edit" />
                      </button>
                      <button className="mst-icon-btn danger" type="button" onClick={() => remove(row.id)}>
                        <i className="fas fa-trash" />
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

export default CafeTablesPage;
