import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { usersApi, usersError } from '../../../api/users/users-api-service';
import { authLogout } from '../../../login/components/state/loginSlice';
import { routerPathNames } from '../../../routes/routerPathNames';
import '../master/Master.css';
import './Users.css';

const empty = { oldPassword: '', newPassword: '', confirmPassword: '' };

const ChangePasswordPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      toast.warning('All password fields are required');
      return;
    }
    if (form.oldPassword === form.newPassword) {
      toast.warning('Old password and new password should not match!');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.warning('New password and confirm password should match!');
      return;
    }
    setBusy(true);
    try {
      await usersApi.changePassword(form);
      toast.success('Password changed successfully. Please login again.');
      dispatch(authLogout());
      navigate(routerPathNames.login);
    } catch (err) {
      toast.error(usersError(err, 'Could not change password'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-lock" /> Change Password</h2>
      <div className="mst-card usr-narrow">
        <div className="mst-card-h">Account Security</div>
        <form className="mst-card-b mst-form one-col" onSubmit={onSubmit}>
          <div className="mst-fg">
            <label>Existing Password <span className="req">*</span></label>
            <input className="mst-inp" type="password" value={form.oldPassword} onChange={(e) => setForm({ ...form, oldPassword: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>New Password <span className="req">*</span></label>
            <input className="mst-inp" type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>Confirm New Password <span className="req">*</span></label>
            <input className="mst-inp" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="submit" disabled={busy}>
              {busy ? 'Updating…' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
