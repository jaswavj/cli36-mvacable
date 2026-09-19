import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { usersApi, usersData, usersError } from '../../../api/users/users-api-service';
import '../master/Master.css';
import './Users.css';
import PermissionTiles, { PermissionBar, type PermItem } from './PermissionTiles';

const empty = { fullName: '', userName: '', password: '' };

const CreateUserPage: React.FC = () => {
  const [form, setForm] = useState(empty);
  const [modules, setModules] = useState<PermItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    usersApi.modules()
      .then((res) => setModules(usersData<PermItem[]>(res) || []))
      .catch((err) => toast.error(usersError(err, 'Could not load modules')));
  }, []);

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.userName.trim() || !form.password.trim()) {
      toast.warning('Full name, username and password are required');
      return;
    }
    setBusy(true);
    try {
      await usersApi.create({
        fullName: form.fullName.trim(),
        userName: form.userName.trim(),
        password: form.password,
        moduleIds: selected,
      });
      toast.success('User created');
      setForm(empty);
      setSelected([]);
    } catch (err) {
      toast.error(usersError(err, 'Could not create user'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-user-plus" /> Create User</h2>
      <form className="usr-layout" onSubmit={onSubmit}>
        <div className="mst-card usr-form-card">
          <div className="mst-card-h">Account details</div>
          <div className="mst-card-b">
            <div className="mst-fg">
              <label>Full Name <span className="req">*</span></label>
              <input
                className="mst-inp"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                autoComplete="name"
                placeholder="Staff display name"
              />
            </div>
            <div className="mst-fg">
              <label>Username <span className="req">*</span></label>
              <input
                className="mst-inp"
                value={form.userName}
                onChange={(e) => setForm({ ...form, userName: e.target.value })}
                autoComplete="username"
                placeholder="Login username"
              />
            </div>
            <div className="mst-fg usr-pw">
              <label>Password <span className="req">*</span></label>
              <input
                className="mst-inp"
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                placeholder="Set a password"
              />
              <button className="usr-pw-toggle" type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`} />
              </button>
            </div>
            <div className="mst-actions">
              <button className="mst-btn mst-btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
                {busy ? 'Saving…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
        <div className="mst-card">
          <div className="mst-card-h">
            <span>Module access</span>
          </div>
          <div className="mst-card-b">
            <PermissionBar
              selected={selected.length}
              total={modules.length}
              onSelectAll={() => setSelected(modules.map((m) => m.id))}
              onClear={() => setSelected([])}
            />
            <PermissionTiles items={modules} selected={selected} onToggle={toggle} emptyText="No modules available." />
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateUserPage;
