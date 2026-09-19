import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { transportApi, transportData, transportError } from '../../../api/transport/transport-api-service';
import '../master/Master.css';
import './Transport.css';
import { BillCard, CollectDialog, checkPayMeta, money, type PayPayload, type TransportBill } from './TransportShared';

const TransportPendingPaymentPage: React.FC = () => {
  const [tab, setTab] = useState<'agent' | 'vehicle'>('agent');
  const [agentRows, setAgentRows] = useState<TransportBill[]>([]);
  const [vehicleRows, setVehicleRows] = useState<TransportBill[]>([]);
  const [search, setSearch] = useState('');
  const [pick, setPick] = useState<TransportBill | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [agents, vehicles] = await Promise.all([
        transportApi.pendingPayments(),
        transportApi.pendingVehiclePayments(),
      ]);
      setAgentRows(transportData<TransportBill[]>(agents) || []);
      setVehicleRows(transportData<TransportBill[]>(vehicles) || []);
    } catch (err) {
      toast.error(transportError(err, 'Could not load pending payments'));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const rows = tab === 'agent' ? agentRows : vehicleRows;
  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        [r.trNo, r.name, r.phone, r.loadFrom, r.loadTo, r.vehicleNo, r.driverNo, r.ownerNo]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [rows, search]
  );

  const totalDue = filtered.reduce(
    (s, r) => s + Number((tab === 'agent' ? r.currentBalance : r.vehBalance) || 0),
    0
  );

  const submit = async (payload: PayPayload) => {
    if (!pick) return;
    if (payload.cashPaid + payload.bankPaid <= 0) {
      toast.warning(tab === 'agent' ? 'Enter an amount to collect' : 'Enter an amount to pay the vehicle');
      return;
    }
    const payErr = checkPayMeta(payload.cashPaid + payload.bankPaid, payload.bankPaid, payload.payDate, payload.utrNo);
    if (payErr) {
      toast.warning(payErr);
      return;
    }
    setBusy(true);
    try {
      const res = transportData<{ currentBalance: number }>(
        tab === 'agent' ? await transportApi.collect(pick.id, payload) : await transportApi.payVehicle(pick.id, payload)
      );
      toast.success(`${tab === 'agent' ? 'Collected' : 'Paid'}. Remaining ${money(res.currentBalance)}`);
      setPick(null);
      await load();
    } catch (err) {
      toast.error(transportError(err, tab === 'agent' ? 'Collection failed' : 'Vehicle payment failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page trb-page">
      <div className="trb-head">
        <div>
          <h2 className="mst-title">
            <i className="fas fa-hand-holding-usd" /> Pending Payment
          </h2>
          <p className="trb-sub">Collect from the agent, or pay remaining hire to the allotted vehicle</p>
        </div>
        <div className="trb-tabs" role="tablist">
          <button type="button" className={tab === 'agent' ? 'on' : ''} onClick={() => setTab('agent')}>
            Collect from Agent
            {agentRows.length > 0 && <em>{agentRows.length}</em>}
          </button>
          <button type="button" className={tab === 'vehicle' ? 'on' : ''} onClick={() => setTab('vehicle')}>
            Pay Vehicle
            {vehicleRows.length > 0 && <em>{vehicleRows.length}</em>}
          </button>
        </div>
      </div>

      <div className="trb-stats">
        <div className="mst-card trb-stat">
          <em>{tab === 'agent' ? 'Due bills' : 'Vehicle dues'}</em>
          <strong>{filtered.length}</strong>
        </div>
        <div className="mst-card trb-stat">
          <em>{tab === 'agent' ? 'Total to collect' : 'Total to pay vehicle'}</em>
          <strong className="due">{money(totalDue)}</strong>
        </div>
      </div>

      <div className="mst-card">
        <div className="mst-card-h">
          <span>
            <i className={tab === 'agent' ? 'fas fa-wallet' : 'fas fa-truck'} />{' '}
            {tab === 'agent' ? 'Agent outstanding' : 'Vehicle hire outstanding'}
          </span>
          <div className="mst-search">
            <i className="fas fa-search" />
            <input className="mst-inp" placeholder="Search TR / name / vehicle" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="trb-desktop mst-table-wrap">
          <table className="mst-table trb-table">
            <thead>
              <tr>
                <th>TR No</th>
                <th>{tab === 'agent' ? 'Transport' : 'Vehicle'}</th>
                <th>From / To</th>
                <th className="num">{tab === 'agent' ? 'Freight' : 'Veh. Freight'}</th>
                <th className="num">Paid</th>
                <th className="num">Balance</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="mst-empty">
                    {tab === 'agent' ? 'No agent balances to collect' : 'No vehicle balances to pay'}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.trNo}</strong>
                    </td>
                    <td>
                      {tab === 'agent' ? row.name : row.vehicleNo || '—'}
                      <div className="trb-muted">{tab === 'agent' ? row.phone : `Dr ${row.driverNo || '—'} · Own ${row.ownerNo || '—'}`}</div>
                    </td>
                    <td>
                      {row.loadFrom} → {row.loadTo}
                    </td>
                    <td className="num">{money(tab === 'agent' ? row.freightAmount : row.vehFreight)}</td>
                    <td className="num">{money(tab === 'agent' ? row.paid : row.vehPaid)}</td>
                    <td className="num due">{money(tab === 'agent' ? row.currentBalance : row.vehBalance)}</td>
                    <td>
                      <button className="mst-btn mst-btn-primary" type="button" onClick={() => setPick(row)}>
                        {tab === 'agent' ? 'Collect' : 'Pay'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="trb-mobile">
          {filtered.length === 0 ? (
            <div className="mst-empty">{tab === 'agent' ? 'No agent balances to collect' : 'No vehicle balances to pay'}</div>
          ) : (
            filtered.map((row) => (
              <BillCard
                key={row.id}
                bill={row}
                actionLabel={tab === 'agent' ? 'Collect' : 'Pay'}
                onAction={() => setPick(row)}
              />
            ))
          )}
        </div>
      </div>

      {pick && (
        <CollectDialog
          title={tab === 'agent' ? 'Collect from agent' : 'Pay vehicle balance'}
          bill={pick}
          kind={tab}
          confirmLabel={tab === 'agent' ? 'Collect' : 'Pay vehicle'}
          busy={busy}
          onClose={() => setPick(null)}
          onConfirm={submit}
        />
      )}
    </div>
  );
};

export default TransportPendingPaymentPage;
