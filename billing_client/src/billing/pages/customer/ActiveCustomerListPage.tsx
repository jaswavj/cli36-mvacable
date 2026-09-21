import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  collectionApi,
  collectionData,
  collectionError,
  type PendingCustomer,
  type PendingList,
} from '../../../api/collection/collection-api-service';
import {
  customerApi,
  customerData,
  customerError,
  type CableCustomer,
  type CustomerType,
  type PagedCustomers,
} from '../../../api/customer/customer-api-service';
import { routerPathNames } from '../../../routes/routerPathNames';
import PageBar, { PAGE_SIZE } from '../../components/PageBar';
import '../master/Master.css';
import './Customer.css';

const show = (v?: string) => (v && v.trim() ? v : '—');
const pad2 = (n: number) => String(n).padStart(2, '0');
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayIso = () => toIsoDate(new Date());
const monthStartIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;
};

type ListTab = 'active' | 'pending' | 'connection' | 'disconnection';

const TABS: { id: ListTab; label: string }[] = [
  { id: 'active', label: 'Active Customers' },
  { id: 'pending', label: 'Pending Payment' },
  { id: 'connection', label: 'New Connection' },
  { id: 'disconnection', label: 'Disconnection' },
];

const TypePill: React.FC<{ type?: string }> = ({ type }) => (
  <span className={`cust-type-pill ${type}`}>
    <i className={type === 'wifi' ? 'fas fa-wifi' : 'fas fa-tv'} />
    {type === 'wifi' ? 'WiFi' : 'Cable'}
  </span>
);

const ActiveCustomerListPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ListTab>('active');
  const [rows, setRows] = useState<CableCustomer[]>([]);
  const [pendingRows, setPendingRows] = useState<PendingCustomer[]>([]);
  const [connectionRows, setConnectionRows] = useState<CableCustomer[]>([]);
  const [disconnectRows, setDisconnectRows] = useState<CableCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CustomerType | ''>('');
  const [fromDate, setFromDate] = useState(monthStartIso);
  const [toDate, setToDate] = useState(todayIso);
  const [busyId, setBusyId] = useState(0);
  const [selected, setSelected] = useState<CableCustomer | null>(null);
  const [disconnecting, setDisconnecting] = useState<CableCustomer | null>(null);
  const [disconnectDate, setDisconnectDate] = useState(todayIso);
  const [disconnectNotes, setDisconnectNotes] = useState('');
  const [reconnecting, setReconnecting] = useState<CableCustomer | null>(null);
  const [reconnectDate, setReconnectDate] = useState(todayIso);
  const [reconnectNotes, setReconnectNotes] = useState('');

  const query = { type: typeFilter, search, page, size: PAGE_SIZE };

  const refresh = async (nextPage = page) => {
    try {
      const data = customerData<PagedCustomers>(
        await customerApi.list({ ...query, page: nextPage, activeOnly: true })
      );
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(customerError(err, 'Could not load active customers'));
    }
  };

  const refreshPending = async (nextPage = page) => {
    try {
      const data = collectionData<PendingList>(
        await collectionApi.pendingCustomers({ type: typeFilter, search, page: nextPage, size: PAGE_SIZE })
      );
      setPendingRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(collectionError(err, 'Could not load pending payment customers'));
    }
  };

  const refreshDated = async (nextTab = tab, from = fromDate, to = toDate, nextPage = page) => {
    if (!from || !to) {
      toast.warning('Select from and to date');
      return;
    }
    if (to < from) {
      toast.warning('To date cannot be before from date');
      return;
    }
    try {
      const data = customerData<PagedCustomers>(
        nextTab === 'disconnection'
          ? await customerApi.disconnections(from, to, { ...query, page: nextPage })
          : await customerApi.connections(from, to, { ...query, page: nextPage })
      );
      if (nextTab === 'disconnection') setDisconnectRows(data.rows || []);
      else setConnectionRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(
        customerError(err, nextTab === 'disconnection' ? 'Could not load disconnections' : 'Could not load new connections')
      );
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (tab === 'pending') refreshPending();
      else if (tab === 'connection' || tab === 'disconnection') refreshDated(tab);
      else refresh();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, search, typeFilter]);

  useEffect(() => {
    if (!selected && !disconnecting && !reconnecting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSelected(null);
      if (!busyId) {
        setDisconnecting(null);
        setReconnecting(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected, disconnecting, reconnecting, busyId]);

  const currentRows =
    tab === 'pending' ? pendingRows : tab === 'connection' ? connectionRows : tab === 'disconnection' ? disconnectRows : rows;
  const pendingTotal = pendingRows.reduce((sum, r) => sum + Number(r.pendingAmount || 0), 0);

  const subtitle =
    tab === 'pending'
      ? `${total} pending · ₹ ${pendingTotal.toFixed(0)} on this page`
      : tab === 'connection'
        ? `${total} new connections`
        : tab === 'disconnection'
          ? `${total} disconnected`
          : `${total} active`;

  const changeTab = (next: ListTab) => {
    setTab(next);
    setPage(1);
    setSelected(null);
    setDisconnecting(null);
    setReconnecting(null);
  };

  const setSearchValue = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const setType = (type: CustomerType | '') => {
    setTypeFilter(type);
    setPage(1);
  };

  const openCollect = (customerId: string) => {
    navigate(routerPathNames.collection, { state: { customerId } });
  };

  const openDisconnect = (row: CableCustomer) => {
    setSelected(null);
    setDisconnecting(row);
    setDisconnectDate(todayIso());
    setDisconnectNotes('');
  };

  const openReconnect = (row: CableCustomer) => {
    setSelected(null);
    setReconnecting(row);
    setReconnectDate(todayIso());
    setReconnectNotes('');
  };

  const confirmReconnect = async () => {
    if (!reconnecting) return;
    if (!reconnectDate) {
      toast.warning('Select reconnect date');
      return;
    }
    if (!reconnectNotes.trim()) {
      toast.warning('Enter reconnect notes');
      return;
    }
    if (reconnecting.disconnectDateIso && reconnectDate < reconnecting.disconnectDateIso) {
      toast.warning('Reconnect date cannot be before disconnect date');
      return;
    }
    setBusyId(reconnecting.id);
    try {
      await customerApi.reconnect(reconnecting.id, {
        reconnectDate,
        notes: reconnectNotes.trim(),
      });
      toast.success('Customer reconnected');
      setReconnecting(null);
      setSelected(null);
      await refresh();
      await refreshDated('disconnection');
    } catch (err) {
      toast.error(customerError(err, 'Could not reconnect customer'));
    } finally {
      setBusyId(0);
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnecting) return;
    if (!disconnectDate) {
      toast.warning('Select disconnect date');
      return;
    }
    if (!disconnectNotes.trim()) {
      toast.warning('Enter disconnect notes');
      return;
    }
    if (disconnecting.joiningDateIso && disconnectDate < disconnecting.joiningDateIso) {
      toast.warning('Disconnect date cannot be before joining date');
      return;
    }
    setBusyId(disconnecting.id);
    try {
      await customerApi.disconnect(disconnecting.id, {
        disconnectDate,
        notes: disconnectNotes.trim(),
      });
      toast.success('Customer disconnected');
      setDisconnecting(null);
      setSelected(null);
      await refresh();
      if (tab === 'disconnection') await refreshDated('disconnection');
    } catch (err) {
      toast.error(customerError(err, 'Could not disconnect customer'));
    } finally {
      setBusyId(0);
    }
  };

  const emptyMessage = () => {
    if (search || typeFilter) return 'No matching customer';
    if (tab === 'pending') return 'No pending payment customers';
    if (tab === 'connection') return 'No new connections in this date range';
    if (tab === 'disconnection') return 'No disconnections in this date range';
    return 'No active customers yet';
  };

  return (
    <div className="mst-page">
      <div className="trp-head">
        <div className="trp-head-icon">
          <i className="fas fa-users" />
        </div>
        <div>
          <h2 className="mst-title">Active Customer List</h2>
          <p className="trp-sub">{subtitle}</p>
        </div>
      </div>

      <div className="cust-tabs">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`cust-tab${tab === item.id ? ' on' : ''}`}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mst-card">
        <div className="mst-card-h">
          <span className="trp-list-title">
            <i
              className={
                tab === 'pending'
                  ? 'fas fa-exclamation-circle'
                  : tab === 'connection'
                    ? 'fas fa-plug'
                    : tab === 'disconnection'
                      ? 'fas fa-unlink'
                      : 'fas fa-list'
              }
            />
            {tab === 'pending'
              ? ' Pending Payment Customers'
              : tab === 'connection'
                ? ' New Connections'
                : tab === 'disconnection'
                  ? ' Disconnected Customers'
                  : ' Customers'}
            <em className="trp-count">{total}</em>
          </span>
          {(tab === 'connection' || tab === 'disconnection') && (
            <div className="cust-dates">
              <div className="mst-fg">
                <label>From Date</label>
                <input className="mst-inp" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="mst-fg">
                <label>To Date</label>
                <input className="mst-inp" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <button
                className="mst-btn mst-btn-primary"
                type="button"
                onClick={() => {
                  setPage(1);
                  refreshDated(tab, fromDate, toDate, 1);
                }}
              >
                Filter
              </button>
            </div>
          )}
          <div className="cust-filters">
            {(['', 'cable', 'wifi'] as const).map((type) => (
              <button
                key={type || 'all'}
                type="button"
                  className={`cust-filter${typeFilter === type ? ' on' : ''}`}
                  onClick={() => setType(type)}
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
                onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </div>
        <div className="mst-table-wrap">
          <table className="mst-table trp-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                <th>Type</th>
                <th>Customer ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Area</th>
                {tab === 'pending' && (
                  <>
                    <th>Pending From</th>
                    <th className="num">Months</th>
                    <th className="num">Pending Amount</th>
                    <th style={{ width: 90 }}>Action</th>
                  </>
                )}
                {tab === 'connection' && (
                  <>
                    <th>Joined</th>
                    <th className="num">Amount</th>
                  </>
                )}
                {tab === 'disconnection' && (
                  <>
                    <th>Joined</th>
                    <th>Disconnected</th>
                    <th>Notes</th>
                    <th className="num">Amount</th>
                    <th style={{ width: 110 }}>Action</th>
                  </>
                )}
                {tab === 'active' && (
                  <>
                    <th>Joined</th>
                    <th className="num">Amount</th>
                    <th style={{ width: 110 }}>Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {currentRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="mst-empty">
                    <i className="fas fa-users" />
                    <div>{emptyMessage()}</div>
                  </td>
                </tr>
              )}
              {tab === 'pending' &&
                pendingRows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <TypePill type={row.customerType} />
                    </td>
                    <td>
                      <strong>{row.customerId}</strong>
                    </td>
                    <td>{row.name}</td>
                    <td className="trp-phone">{show(row.mobile)}</td>
                    <td>{show(row.area)}</td>
                    <td>{show(row.firstPendingMonth)}</td>
                    <td className="num">{row.pendingMonths || 0}</td>
                    <td className="num">
                      <strong className="cust-pending-amt">₹ {Number(row.pendingAmount || 0).toFixed(0)}</strong>
                    </td>
                    <td>
                      <button className="cust-collect-btn" type="button" onClick={() => openCollect(row.customerId)}>
                        Collect
                      </button>
                    </td>
                  </tr>
                ))}
              {tab === 'connection' &&
                connectionRows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`mst-click-row${selected?.id === row.id ? ' trp-row-on' : ''}`}
                    onClick={() => setSelected(row)}
                  >
                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <TypePill type={row.customerType} />
                    </td>
                    <td>
                      <strong>{row.customerId}</strong>
                    </td>
                    <td>{row.name}</td>
                    <td className="trp-phone">{show(row.mobile)}</td>
                    <td>{show(row.area)}</td>
                    <td>{show(row.joiningDate)}</td>
                    <td className="num">
                      <strong>₹ {Number(row.monthlyAmount || 0).toFixed(0)}</strong>
                    </td>
                  </tr>
                ))}
              {tab === 'disconnection' &&
                disconnectRows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`mst-click-row${selected?.id === row.id ? ' trp-row-on' : ''}`}
                    onClick={() => setSelected(row)}
                  >
                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <TypePill type={row.customerType} />
                    </td>
                    <td>
                      <strong>{row.customerId}</strong>
                    </td>
                    <td>{row.name}</td>
                    <td className="trp-phone">{show(row.mobile)}</td>
                    <td>{show(row.area)}</td>
                    <td>{show(row.joiningDate)}</td>
                    <td>{show(row.disconnectDate)}</td>
                    <td>{show(row.disconnectNotes)}</td>
                    <td className="num">
                      <strong>₹ {Number(row.monthlyAmount || 0).toFixed(0)}</strong>
                    </td>
                    <td>
                      <button
                        className="cust-collect-btn"
                        type="button"
                        disabled={busyId === row.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openReconnect(row);
                        }}
                      >
                        Reconnect
                      </button>
                    </td>
                  </tr>
                ))}
              {tab === 'active' &&
                rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`mst-click-row${selected?.id === row.id ? ' trp-row-on' : ''}`}
                    onClick={() => setSelected(row)}
                  >
                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <TypePill type={row.customerType} />
                    </td>
                    <td>
                      <strong>{row.customerId}</strong>
                    </td>
                    <td>{row.name}</td>
                    <td className="trp-phone">{show(row.mobile)}</td>
                    <td>{show(row.area)}</td>
                    <td>{show(row.joiningDate)}</td>
                    <td className="num">
                      <strong>₹ {Number(row.monthlyAmount || 0).toFixed(0)}</strong>
                    </td>
                    <td>
                      <button
                        className="mst-icon-btn"
                        type="button"
                        title="Edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(routerPathNames.addCustomer, { state: { customer: row } });
                        }}
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <button
                        className="mst-icon-btn danger"
                        type="button"
                        title="Disconnect"
                        disabled={busyId === row.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openDisconnect(row);
                        }}
                      >
                        <i className="fas fa-unlink" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <PageBar page={page} total={total} onPage={setPage} />
      </div>

      {selected && (
        <div className="cust-modal" onClick={() => setSelected(null)}>
          <div className="cust-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cust-modal-h">
              <div>
                <h3>Customer Details</h3>
                <p>
                  <TypePill type={selected.customerType} />
                </p>
              </div>
              <button className="mst-icon-btn" type="button" onClick={() => setSelected(null)} title="Close">
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="cust-modal-b">
              <div className="cust-detail">
                <span>Customer ID</span>
                <strong>{show(selected.customerId)}</strong>
              </div>
              <div className="cust-detail">
                <span>Name</span>
                <strong>{show(selected.name)}</strong>
              </div>
              <div className="cust-detail">
                <span>Mobile Number</span>
                <strong>{show(selected.mobile)}</strong>
              </div>
              <div className="cust-detail">
                <span>Area</span>
                <strong>{show(selected.area)}</strong>
              </div>
              <div className="cust-detail">
                <span>Joining Date</span>
                <strong>{show(selected.joiningDate)}</strong>
              </div>
              <div className="cust-detail">
                <span>Monthly Amount</span>
                <strong>₹ {Number(selected.monthlyAmount || 0).toFixed(0)}</strong>
              </div>
              {selected.disconnectDate && (
                <div className="cust-detail">
                  <span>Disconnect Date</span>
                  <strong>{show(selected.disconnectDate)}</strong>
                </div>
              )}
              <div className="cust-detail">
                <span>Created By</span>
                <strong>{show(selected.createdBy)}</strong>
              </div>
              <div className="cust-detail span-2">
                <span>Address</span>
                <strong>{show(selected.address)}</strong>
              </div>
              <div className="cust-detail span-2">
                <span>Notes</span>
                <strong>{show(selected.notes)}</strong>
              </div>
              {selected.disconnectNotes && (
                <div className="cust-detail span-2">
                  <span>Disconnect Notes</span>
                  <strong>{show(selected.disconnectNotes)}</strong>
                </div>
              )}
              {selected.reconnectDate && (
                <div className="cust-detail">
                  <span>Reconnect Date</span>
                  <strong>{show(selected.reconnectDate)}</strong>
                </div>
              )}
              {selected.reconnectNotes && (
                <div className="cust-detail span-2">
                  <span>Reconnect Notes</span>
                  <strong>{show(selected.reconnectNotes)}</strong>
                </div>
              )}
            </div>
            {tab === 'disconnection' && (
              <div className="cust-modal-f">
                <button
                  className="mst-btn mst-btn-primary"
                  type="button"
                  disabled={busyId === selected.id}
                  onClick={() => openReconnect(selected)}
                >
                  <i className="fas fa-plug" /> Reconnect
                </button>
              </div>
            )}
            {tab === 'active' && (
              <div className="cust-modal-f">
                <button
                  className="mst-btn mst-btn-outline"
                  type="button"
                  onClick={() => navigate(routerPathNames.addCustomer, { state: { customer: selected } })}
                >
                  <i className="fas fa-edit" /> Edit
                </button>
                <button
                  className="mst-btn mst-btn-danger"
                  type="button"
                  disabled={busyId === selected.id}
                  onClick={() => openDisconnect(selected)}
                >
                  <i className="fas fa-unlink" /> Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {reconnecting && (
        <div className="cust-modal" onClick={() => !busyId && setReconnecting(null)}>
          <div className="cust-modal-box narrow" onClick={(e) => e.stopPropagation()}>
            <div className="cust-modal-h">
              <div>
                <h3>Reconnect Customer</h3>
                <p>
                  {reconnecting.name} ({reconnecting.customerId})
                </p>
              </div>
              <button
                className="mst-icon-btn"
                type="button"
                title="Close"
                disabled={Boolean(busyId)}
                onClick={() => setReconnecting(null)}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="cust-modal-b">
              <div className="mst-fg span-2">
                <label>Reconnect Date</label>
                <input
                  className="mst-inp"
                  type="date"
                  value={reconnectDate}
                  min={reconnecting.disconnectDateIso || reconnecting.joiningDateIso || undefined}
                  max={todayIso()}
                  onChange={(e) => setReconnectDate(e.target.value)}
                />
              </div>
              <div className="mst-fg span-2">
                <label>Notes</label>
                <textarea
                  className="mst-inp"
                  rows={3}
                  placeholder="Reason for reconnection"
                  value={reconnectNotes}
                  onChange={(e) => setReconnectNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="cust-modal-f">
              <button
                className="mst-btn mst-btn-outline"
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => setReconnecting(null)}
              >
                Cancel
              </button>
              <button
                className="mst-btn mst-btn-primary"
                type="button"
                disabled={busyId === reconnecting.id}
                onClick={confirmReconnect}
              >
                <i className="fas fa-plug" /> {busyId === reconnecting.id ? 'Saving…' : 'Reconnect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {disconnecting && (
        <div className="cust-modal" onClick={() => !busyId && setDisconnecting(null)}>
          <div className="cust-modal-box narrow" onClick={(e) => e.stopPropagation()}>
            <div className="cust-modal-h">
              <div>
                <h3>Disconnect Customer</h3>
                <p>
                  {disconnecting.name} ({disconnecting.customerId})
                </p>
              </div>
              <button
                className="mst-icon-btn"
                type="button"
                title="Close"
                disabled={Boolean(busyId)}
                onClick={() => setDisconnecting(null)}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="cust-modal-b">
              <div className="mst-fg span-2">
                <label>Disconnect Date</label>
                <input
                  className="mst-inp"
                  type="date"
                  value={disconnectDate}
                  min={disconnecting.joiningDateIso || undefined}
                  max={todayIso()}
                  onChange={(e) => setDisconnectDate(e.target.value)}
                />
              </div>
              <div className="mst-fg span-2">
                <label>Notes</label>
                <textarea
                  className="mst-inp"
                  rows={3}
                  placeholder="Reason for disconnection"
                  value={disconnectNotes}
                  onChange={(e) => setDisconnectNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="cust-modal-f">
              <button
                className="mst-btn mst-btn-outline"
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => setDisconnecting(null)}
              >
                Cancel
              </button>
              <button
                className="mst-btn mst-btn-danger"
                type="button"
                disabled={busyId === disconnecting.id}
                onClick={confirmDisconnect}
              >
                <i className="fas fa-unlink" /> {busyId === disconnecting.id ? 'Saving…' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveCustomerListPage;
