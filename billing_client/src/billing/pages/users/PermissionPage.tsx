import React, { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { usersApi, usersData, usersError } from '../../../api/users/users-api-service';
import { RootState } from '../../../state/store';
import '../master/Master.css';
import '../quick-bill/QuickBill.css';
import './Users.css';
import PermissionTiles, { PermissionBar, type PermItem } from './PermissionTiles';

type Kind = 'module' | 'special';
type UserOpt = { id: number; name: string; userName?: string; shopName?: string };
type Perms = { userId: number; name: string; all: PermItem[]; selectedIds: number[] };
type PageTab = 'edit' | 'blocked';

const PermissionPage: React.FC<{ kind: Kind }> = ({ kind }) => {
  const isModule = kind === 'module';
  const loginId = useSelector((s: RootState) => s.loginData.id);
  const [tab, setTab] = useState<PageTab>('edit');
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<UserOpt[]>([]);
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<PermItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const current = useMemo(
    () => users.find((u) => String(u.id) === userId),
    [users, userId]
  );

  const loadActiveUsers = async () => {
    try {
      setUsers(usersData<UserOpt[]>(await usersApi.list()) || []);
    } catch (err) {
      toast.error(usersError(err, 'Could not load users'));
    }
  };

  const loadBlockedUsers = async () => {
    try {
      setBlockedUsers(usersData<UserOpt[]>(await usersApi.list(undefined, true)) || []);
    } catch (err) {
      toast.error(usersError(err, 'Could not load blocked users'));
    }
  };

  useEffect(() => {
    loadActiveUsers();
  }, []);

  useEffect(() => {
    if (tab === 'blocked' && isModule) {
      loadBlockedUsers();
    }
  }, [tab, isModule]);

  const load = async (id: string) => {
    setUserId(id);
    if (!id) {
      setItems([]);
      setSelected([]);
      return;
    }
    try {
      const res = isModule ? await usersApi.permissions(Number(id)) : await usersApi.specialPermissions(Number(id));
      const data = usersData<Perms>(res);
      setItems(data.all || []);
      setSelected((data.selectedIds || []).map(Number));
    } catch (err) {
      toast.error(usersError(err, 'Could not load permissions'));
    }
  };

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const save = async () => {
    if (!userId) {
      toast.warning('Choose a user');
      return;
    }
    setBusy(true);
    try {
      if (isModule) {
        await usersApi.savePermissions(Number(userId), selected);
      } else {
        await usersApi.saveSpecialPermissions(Number(userId), selected);
      }
      toast.success('Permissions updated');
    } catch (err) {
      toast.error(usersError(err, 'Could not update permissions'));
    } finally {
      setBusy(false);
    }
  };

  const blockUser = async () => {
    if (!userId) {
      toast.warning('Choose a user');
      return;
    }
    if (Number(userId) === Number(loginId)) {
      toast.warning('You cannot block your own login');
      return;
    }
    if (!window.confirm(`Block ${current?.name || 'this user'}? They will not be able to log in.`)) return;
    setBusy(true);
    try {
      await usersApi.blockUser(Number(userId));
      toast.success('User blocked');
      setUserId('');
      setItems([]);
      setSelected([]);
      await loadActiveUsers();
    } catch (err) {
      toast.error(usersError(err, 'Could not block user'));
    } finally {
      setBusy(false);
    }
  };

  const unblockUser = async (row: UserOpt) => {
    if (!window.confirm(`Unblock ${row.name}?`)) return;
    setBusy(true);
    try {
      await usersApi.unblockUser(row.id);
      toast.success('User unblocked');
      await loadBlockedUsers();
      await loadActiveUsers();
    } catch (err) {
      toast.error(usersError(err, 'Could not unblock user'));
    } finally {
      setBusy(false);
    }
  };

  const initial = (current?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className={isModule ? 'fas fa-user-edit' : 'fas fa-unlock'} />
        {isModule ? 'Edit User / Permission' : 'Special Permission'}
      </h2>

      {isModule && (
        <div className="qb-tabs" role="tablist">
          <button type="button" className={tab === 'edit' ? 'on' : ''} onClick={() => setTab('edit')}>
            Edit User / Permission
          </button>
          <button type="button" className={tab === 'blocked' ? 'on' : ''} onClick={() => setTab('blocked')}>
            Blocked Users
          </button>
        </div>
      )}

      {tab === 'edit' && (
        <>
          <div className="mst-card" style={{ marginBottom: 12 }}>
            <div className="mst-card-h">Choose user</div>
            <div className="mst-card-b">
              <div className="usr-picker">
                <span className="usr-avatar">{userId ? initial : <i className="fas fa-user" />}</span>
                <div className="mst-fg">
                  <label>Staff member</label>
                  <select className="mst-sel" value={userId} onChange={(e) => load(e.target.value)}>
                    <option value="">Select a user to edit access</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {!userId ? (
            <div className="mst-card">
              <div className="usr-empty">
                <i className={isModule ? 'fas fa-user-edit' : 'fas fa-unlock-alt'} />
                <p>Select a user to view and update {isModule ? 'module' : 'special'} permissions.</p>
              </div>
            </div>
          ) : (
            <div className="mst-card">
              <div className="mst-card-h">
                <span>{isModule ? 'Modules' : 'Special permissions'} for {current?.name || 'user'}</span>
              </div>
              <div className="mst-card-b">
                <PermissionBar
                  selected={selected.length}
                  total={items.length}
                  onSelectAll={() => setSelected(items.map((m) => m.id))}
                  onClear={() => setSelected([])}
                  disabled={busy}
                />
                <PermissionTiles
                  items={items}
                  selected={selected}
                  onToggle={toggle}
                  emptyText={isModule ? 'No modules found.' : 'No special permissions found.'}
                />
                <div className="usr-save-row">
                  {isModule && (
                    <button className="mst-btn mst-btn-outline" type="button" disabled={busy} onClick={blockUser}>
                      <i className="fas fa-ban" /> Block user
                    </button>
                  )}
                  <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={save}>
                    {busy ? 'Saving…' : 'Save permissions'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'blocked' && isModule && (
        <div className="mst-card">
          <div className="mst-card-h">
            <span>Blocked users</span>
            <span className="qb-bills-total">{blockedUsers.length} users</span>
          </div>
          {blockedUsers.length === 0 ? (
            <div className="mst-empty">No blocked users.</div>
          ) : (
            <div className="mst-table-wrap">
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Shop</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {blockedUsers.map((row, i) => (
                    <tr key={row.id}>
                      <td>{i + 1}</td>
                      <td>{row.name}</td>
                      <td>{row.shopName || '—'}</td>
                      <td>
                        <button className="mst-icon-btn" type="button" disabled={busy} onClick={() => unblockUser(row)}>
                          <i className="fas fa-check" /> Unblock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ModulePermissionPage: React.FC = () => <PermissionPage kind="module" />;
export const SpecialPermissionPage: React.FC = () => <PermissionPage kind="special" />;

export default ModulePermissionPage;
