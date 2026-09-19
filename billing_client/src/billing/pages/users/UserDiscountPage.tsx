import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { usersApi, usersData, usersError } from '../../../api/users/users-api-service';
import '../master/Master.css';
import './Users.css';

type Row = { id: number; userName: string; fullName: string; discPer: number };

const UserDiscountPage: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [edit, setEdit] = useState<Row | null>(null);
  const [value, setValue] = useState('0');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setRows(usersData<Row[]>(await usersApi.discounts()) || []);
    } catch (err) {
      toast.error(usersError(err, 'Could not load users'));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const open = (row: Row) => {
    setEdit(row);
    setValue(String(row.discPer ?? 0));
  };

  const save = async () => {
    if (!edit) return;
    const disc = parseInt(value, 10);
    if (Number.isNaN(disc) || disc < 0 || disc > 100) {
      toast.error('Discount must be between 0 and 100.');
      return;
    }
    setBusy(true);
    try {
      await usersApi.saveDiscount(edit.id, disc);
      toast.success('Discount updated');
      setEdit(null);
      await refresh();
    } catch (err) {
      toast.error(usersError(err, 'Could not update discount'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-percent" /> User Discount</h2>
      <div className="mst-card">
        <div className="mst-card-h">Discount Settings</div>
        <div className="mst-table-wrap">
          <table className="mst-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Username</th>
                <th>Full Name</th>
                <th className="num">Discount %</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="mst-empty">No users found.</td></tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.userName}</td>
                    <td>{row.fullName || '—'}</td>
                    <td className="num"><span className="mst-badge on">{row.discPer}%</span></td>
                    <td>
                      <button className="mst-icon-btn" type="button" onClick={() => open(row)}>
                        <i className="fas fa-pen" /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <div className="usr-modal" onClick={() => setEdit(null)}>
          <div className="usr-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="mst-card-h">Edit Discount</div>
            <div className="mst-card-b mst-form one-col">
              <div style={{ fontWeight: 700 }}>
                {edit.fullName ? `${edit.fullName} (${edit.userName})` : edit.userName}
              </div>
              <div className="mst-note">Current discount: {edit.discPer}%</div>
              <div className="mst-fg">
                <label>New Discount %</label>
                <input
                  className="mst-inp"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') save();
                  }}
                />
                <div className="mst-note">Enter a value between 0 and 100.</div>
              </div>
              <div className="mst-actions">
                <button className="mst-btn mst-btn-outline" type="button" onClick={() => setEdit(null)}>Cancel</button>
                <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={save}>
                  {busy ? 'Saving…' : 'Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDiscountPage;
