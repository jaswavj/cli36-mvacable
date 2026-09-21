import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  customerApi,
  customerData,
  customerError,
  type CableCustomer,
  type CustomerType,
} from '../../../api/customer/customer-api-service';
import '../master/Master.css';
import './Customer.css';

const today = () => new Date().toISOString().slice(0, 10);

const empty = {
  id: 0,
  customerType: '' as CustomerType | '',
  customerId: '',
  name: '',
  mobile: '',
  address: '',
  area: '',
  joiningDate: today(),
  notes: '',
  monthlyAmount: '',
};

const show = (v?: string) => (v && v.trim() ? v : '—');

const AddCustomerPage: React.FC = () => {
  const location = useLocation();
  const [rows, setRows] = useState<CableCustomer[]>([]);
  const [form, setForm] = useState(empty);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CustomerType | ''>('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setRows(customerData<CableCustomer[]>(await customerApi.list()) || []);
    } catch (err) {
      toast.error(customerError(err, 'Could not load customers'));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const reset = () => setForm({ ...empty, joiningDate: today() });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerType) {
      toast.warning('Choose Cable or WiFi');
      return;
    }
    if (!form.customerId.trim()) {
      toast.warning('Customer ID is required');
      return;
    }
    if (!form.name.trim()) {
      toast.warning('Customer name is required');
      return;
    }
    if (!form.mobile.trim()) {
      toast.warning('Mobile number is required');
      return;
    }
    if (!Number(form.monthlyAmount) || Number(form.monthlyAmount) <= 0) {
      toast.warning('Monthly collection amount is required');
      return;
    }
    setBusy(true);
    try {
      await customerApi.save({
        id: form.id || undefined,
        customerType: form.customerType,
        customerId: form.customerId.trim(),
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        area: form.area.trim(),
        joiningDate: form.joiningDate || today(),
        notes: form.notes.trim(),
        monthlyAmount: Number(form.monthlyAmount),
      });
      toast.success(form.id ? 'Customer updated' : 'Customer added');
      reset();
      await refresh();
    } catch (err) {
      toast.error(customerError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const editRow = (row: CableCustomer) => {
    setForm({
      id: row.id,
      customerType: (row.customerType === 'wifi' ? 'wifi' : 'cable') as CustomerType,
      customerId: row.customerId || '',
      name: row.name || '',
      mobile: row.mobile || '',
      address: row.address || '',
      area: row.area || '',
      joiningDate: row.joiningDateIso || today(),
      notes: row.notes || '',
      monthlyAmount: row.monthlyAmount ? String(row.monthlyAmount) : '',
    });
  };

  useEffect(() => {
    const customer = (location.state as { customer?: CableCustomer } | null)?.customer;
    if (customer) editRow(customer);
  }, [location.state]);

  const filtered = rows.filter((r) => {
    if (typeFilter && r.customerType !== typeFilter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return [r.customerId, r.name, r.mobile, r.address, r.area, r.customerType]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="mst-page">
      <div className="trp-head">
        <div className="trp-head-icon">
          <i className="fas fa-user-plus" />
        </div>
        <div>
          <h2 className="mst-title">Add Customer</h2>
          <p className="trp-sub">Cable and WiFi customers for monthly collection</p>
        </div>
      </div>

      <div className="mst-grid cust-add-grid">
        <div className="mst-card">
          <div className="mst-card-h">
            <span>
              <i className={form.id ? 'fas fa-pen' : 'fas fa-plus-circle'} /> {form.id ? 'Edit Customer' : 'New Customer'}
            </span>
          </div>
          <form className="mst-card-b mst-form one-col" onSubmit={onSubmit}>
            <div className="mst-fg">
              <label>
                Type <span className="req">*</span>
              </label>
              <div className="cust-types">
                <button
                  type="button"
                  className={`cust-type${form.customerType === 'cable' ? ' on' : ''}`}
                  onClick={() => setForm({ ...form, customerType: 'cable' })}
                >
                  <i className="fas fa-tv" /> Cable
                </button>
                <button
                  type="button"
                  className={`cust-type${form.customerType === 'wifi' ? ' on' : ''}`}
                  onClick={() => setForm({ ...form, customerType: 'wifi' })}
                >
                  <i className="fas fa-wifi" /> WiFi
                </button>
              </div>
            </div>
            <div className="mst-fg">
              <label>
                Customer ID <span className="req">*</span>
              </label>
              <input
                className="mst-inp"
                placeholder="e.g. C001 or W001"
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
              />
            </div>
            <div className="mst-fg">
              <label>
                Name <span className="req">*</span>
              </label>
              <input
                className="mst-inp"
                placeholder="Customer name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="mst-fg">
              <label>
                Mobile Number <span className="req">*</span>
              </label>
              <input
                className="mst-inp"
                type="tel"
                inputMode="tel"
                placeholder="10-digit mobile"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              />
            </div>
            <div className="mst-fg">
              <label>Address</label>
              <textarea
                className="mst-area"
                rows={2}
                placeholder="House / street"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className="mst-fg">
              <label>Area</label>
              <input
                className="mst-inp"
                placeholder="Area / locality"
                value={form.area}
                onChange={(e) => setForm({ ...form, area: e.target.value })}
              />
            </div>
            <div className="mst-fg">
              <label>
                Monthly Collection Amount <span className="req">*</span>
              </label>
              <input
                className="mst-inp"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 250"
                value={form.monthlyAmount}
                onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })}
              />
            </div>
            <div className="mst-fg">
              <label>Joining Date</label>
              <input
                className="mst-inp"
                type="date"
                value={form.joiningDate}
                onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
              />
            </div>
            <div className="mst-fg">
              <label>Notes</label>
              <textarea
                className="mst-area"
                rows={2}
                placeholder="Optional notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="mst-actions">
              <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">
                <i className="fas fa-save" /> {form.id ? 'Update' : 'Add Customer'}
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
              <i className="fas fa-list" /> Customers
              <em className="trp-count">{filtered.length}</em>
            </span>
            <div className="cust-filters">
              {(['', 'cable', 'wifi'] as const).map((type) => (
                <button
                  key={type || 'all'}
                  type="button"
                  className={`cust-filter${typeFilter === type ? ' on' : ''}`}
                  onClick={() => setTypeFilter(type)}
                >
                  {type === '' ? 'All' : type === 'cable' ? 'Cable' : 'WiFi'}
                </button>
              ))}
            </div>
            <div className="mst-search">
              <i className="fas fa-search" />
              <input
                className="mst-inp"
                placeholder="Search ID, name, mobile, area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="mst-table-wrap">
            <table className="mst-table trp-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th>Type</th>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Area</th>
                  <th>Joined</th>
                  <th style={{ width: 72 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="mst-empty">
                      <i className="fas fa-users" />
                      <div>{search || typeFilter ? 'No matching customer' : 'No customers yet'}</div>
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
                      <span className={`cust-type-pill ${row.customerType}`}>
                        <i className={row.customerType === 'wifi' ? 'fas fa-wifi' : 'fas fa-tv'} />
                        {row.customerType === 'wifi' ? 'WiFi' : 'Cable'}
                      </span>
                    </td>
                    <td>
                      <strong>{row.customerId}</strong>
                    </td>
                    <td>
                      {row.name}
                      {row.isActive === 0 && <span className="mst-badge off" style={{ marginLeft: 6 }}>Inactive</span>}
                    </td>
                    <td className="trp-phone">{show(row.mobile)}</td>
                    <td>{show(row.area)}</td>
                    <td>{show(row.joiningDate)}</td>
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

export default AddCustomerPage;
