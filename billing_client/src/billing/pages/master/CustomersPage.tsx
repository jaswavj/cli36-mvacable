import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { masterApi, masterData, masterError } from '../../../api/master/master-api-service';
import './Master.css';

type Transport = {
  id: number;
  name: string;
  address: string;
  phone: string;
  gstin: string;
  isGst: number;
  isEligibleForCommission: number;
};

const empty = {
  id: 0,
  name: '',
  phone: '',
  address: '',
  gstin: '',
  isGst: 0,
  isEligibleForCommission: 0,
};

const dash = (v?: string) => (!v || v === '-' ? '' : v);
const show = (v?: string) => (dash(v) ? v : '—');

const CustomersPage: React.FC = () => {
  const [rows, setRows] = useState<Transport[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setRows(masterData<Transport[]>(await masterApi.customers()) || []);
    } catch (err) {
      toast.error(masterError(err, 'Could not load transports'));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const reset = () => setForm(empty);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.warning('Transport name is required');
      return;
    }
    setBusy(true);
    try {
      await masterApi.saveCustomer({
        id: form.id || undefined,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        gstin: form.gstin,
        isGst: form.isGst,
        isEligibleForCommission: form.isEligibleForCommission,
      });
      toast.success(form.id ? 'Transport updated' : 'Transport added');
      reset();
      await refresh();
    } catch (err) {
      toast.error(masterError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const editRow = (row: Transport) => {
    setForm({
      id: row.id,
      name: row.name,
      phone: dash(row.phone),
      address: dash(row.address),
      gstin: dash(row.gstin),
      isGst: row.isGst,
      isEligibleForCommission: row.isEligibleForCommission,
    });
  };

  const filtered = rows.filter((r) =>
    [r.name, r.phone, r.address].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mst-page">
      <div className="trp-head">
        <div className="trp-head-icon">
          <i className="fas fa-truck" />
        </div>
        <div>
          <h2 className="mst-title">Transport</h2>
          <p className="trp-sub">Name, phone and address for each transport party</p>
        </div>
      </div>

      <div className="mst-grid">
        <div className="mst-card">
          <div className="mst-card-h">
            <span>
              <i className={form.id ? 'fas fa-pen' : 'fas fa-plus-circle'} /> {form.id ? 'Edit Transport' : 'Add Transport'}
            </span>
          </div>
          <form className="mst-card-b mst-form one-col" onSubmit={onSubmit}>
            <div className="mst-fg">
              <label>
                Transport Name <span className="req">*</span>
              </label>
              <div className="trp-field">
                <i className="fas fa-truck" />
                <input
                  className="mst-inp"
                  placeholder="e.g. VMT Logistics"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              </div>
            </div>
            <div className="mst-fg">
              <label>Phone Number</label>
              <div className="trp-field">
                <i className="fas fa-phone" />
                <input
                  className="mst-inp"
                  type="tel"
                  inputMode="tel"
                  placeholder="10-digit mobile"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="mst-fg">
              <label>Address</label>
              <div className="trp-field trp-field-area">
                <i className="fas fa-map-marker-alt" />
                <textarea
                  className="mst-area"
                  rows={3}
                  placeholder="City / area"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
            </div>
            <div className="mst-actions">
              <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">
                <i className="fas fa-save" /> {form.id ? 'Update' : 'Add Transport'}
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
              <i className="fas fa-list" /> Transport List
              <em className="trp-count">{filtered.length}</em>
            </span>
            <div className="mst-search">
              <i className="fas fa-search" />
              <input
                className="mst-inp"
                placeholder="Search name, phone, address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="mst-table-wrap">
            <table className="mst-table trp-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>#</th>
                  <th>Name</th>
                  <th style={{ width: 140 }}>Phone</th>
                  <th>Address</th>
                  <th style={{ width: 72 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="mst-empty">
                      <i className="fas fa-truck" />
                      <div>{search ? 'No matching transport' : 'No transports yet'}</div>
                    </td>
                  </tr>
                )}
                {filtered.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`mst-click-row${form.id === row.id ? ' trp-row-on' : ''}`}
                    onClick={() => editRow(row)}
                  >
                    <td>{i + 1}</td>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td className="trp-phone">{show(row.phone)}</td>
                    <td className="trp-addr">{show(row.address)}</td>
                    <td>
                      <button
                        className="mst-icon-btn"
                        type="button"
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          editRow(row);
                        }}
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

export default CustomersPage;
