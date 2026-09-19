import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { expenseApi, expenseData, expenseError } from '../../../api/expense/expense-api-service';
import '../master/Master.css';

type Row = { id: number; name: string };

const ExpenseTypePage: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(0);
  const [blockIt, setBlockIt] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setRows(expenseData<Row[]>(await expenseApi.types()) || []);
    } catch (err) {
      toast.error(expenseError(err, 'Could not load expense types'));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const reset = () => {
    setName('');
    setEditId(0);
    setBlockIt(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Expense type name is required');
      return;
    }
    setBusy(true);
    try {
      if (editId && blockIt) {
        await expenseApi.blockType(editId);
        toast.info('Expense type blocked successfully');
      } else {
        await expenseApi.saveType({ id: editId || undefined, name: name.trim() });
        toast.success(editId ? 'Expense type updated successfully!' : 'Expense type added successfully!');
      }
      reset();
      await refresh();
    } catch (err) {
      toast.error(expenseError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-tags" /> Expense Types</h2>
      <div className="mst-grid">
        <div className="mst-card">
          <div className="mst-card-h">
            <span><i className="fas fa-plus-circle" /> {editId ? 'Edit Expense Type' : 'Add New Expense Type'}</span>
          </div>
          <form className="mst-card-b mst-form one-col" onSubmit={onSubmit}>
            <div className="mst-fg">
              <label>Expense Type Name <span className="req">*</span></label>
              <input className="mst-inp" value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Enter expense type name" />
            </div>
            {editId > 0 && (
              <label className="mst-block mst-check">
                <input type="checkbox" checked={blockIt} onChange={(e) => setBlockIt(e.target.checked)} />
                Block this expense type
              </label>
            )}
            <div className="mst-actions">
              <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">
                <i className="fas fa-save" /> {editId ? 'Update' : 'Add Expense Type'}
              </button>
              {editId > 0 && (
                <button className="mst-btn mst-btn-outline" type="button" onClick={reset}>Cancel</button>
              )}
            </div>
          </form>
        </div>
        <div className="mst-card">
          <div className="mst-card-h">
            <span><i className="fas fa-list" /> Expense Type List</span>
            <div className="mst-search">
              <i className="fas fa-search" />
              <input className="mst-inp" placeholder="Search expense type..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr><th style={{ width: 50 }}>#</th><th>Name</th><th style={{ width: 80 }}>Action</th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={3} className="mst-empty">No expense types found. Add your first expense type.</td></tr>}
                {filtered.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.name}</td>
                    <td>
                      <button className="mst-icon-btn" type="button" title="Edit" onClick={() => { setEditId(row.id); setName(row.name); setBlockIt(false); }}>
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

export default ExpenseTypePage;
