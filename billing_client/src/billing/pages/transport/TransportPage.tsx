import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { transportApi, transportData, transportError } from '../../../api/transport/transport-api-service';
import '../master/Master.css';
import './Transport.css';
import {
  AllotDialog,
  AllottedDialog,
  BillCard,
  PayFields,
  checkPayMeta,
  fillMode,
  money,
  today,
  type AllotPayload,
  type TransportBill,
  type TransportParty,
} from './TransportShared';

const emptyPay = { mode: '1', payType: '1', cashPaid: '0', bankPaid: '0', balance: '0', payDate: today(), utrNo: '' };

const TransportPage: React.FC = () => {
  const [tab, setTab] = useState<'transport' | 'allotments' | 'allotted'>('transport');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partyId, setPartyId] = useState(0);
  const [hits, setHits] = useState<TransportParty[]>([]);
  const [loadFrom, setLoadFrom] = useState('');
  const [loadTo, setLoadTo] = useState('');
  const [freight, setFreight] = useState('');
  const [pay, setPay] = useState(emptyPay);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [bills, setBills] = useState<TransportBill[]>([]);
  const [pending, setPending] = useState<TransportBill[]>([]);
  const [allotted, setAllotted] = useState<TransportBill[]>([]);
  const [pick, setPick] = useState<TransportBill | null>(null);
  const [view, setView] = useState<TransportBill | null>(null);

  const freightAmt = parseFloat(freight) || 0;
  const cash = parseFloat(pay.cashPaid) || 0;
  const bank = parseFloat(pay.bankPaid) || 0;
  const paid = cash + bank;
  const balance = Math.max(0, freightAmt - paid);

  const loadBills = async () => {
    try {
      setBills(transportData<TransportBill[]>(await transportApi.bills()) || []);
    } catch (err) {
      toast.error(transportError(err, 'Could not load transport bills'));
    }
  };

  const loadPending = async () => {
    try {
      setPending(transportData<TransportBill[]>(await transportApi.pendingAllotments()) || []);
    } catch (err) {
      toast.error(transportError(err, 'Could not load pending allotments'));
    }
  };

  const loadAllotted = async () => {
    try {
      setAllotted(transportData<TransportBill[]>(await transportApi.allotted()) || []);
    } catch (err) {
      toast.error(transportError(err, 'Could not load allotted list'));
    }
  };

  useEffect(() => {
    loadBills();
    loadPending();
    loadAllotted();
  }, []);

  useEffect(() => {
    if (pay.mode === '3') return;
    const filled = fillMode(pay.mode, freightAmt);
    setPay((prev) => ({ ...prev, cashPaid: filled.cash, bankPaid: filled.bank, balance: filled.balance }));
  }, [freightAmt, pay.mode]);

  const searchParties = async (query?: string, ph?: string) => {
    if ((!query || query.length < 1) && (!ph || ph.length < 2)) {
      setHits([]);
      return;
    }
    try {
      const res: any = await transportApi.searchTransports(query, ph);
      setHits(res?.data || []);
    } catch {
      setHits([]);
    }
  };

  const pickParty = (c: TransportParty) => {
    setPartyId(c.id);
    setName(c.name);
    setPhone(c.phone === '-' ? '' : c.phone);
    setHits([]);
  };

  const resetForm = () => {
    setName('');
    setPhone('');
    setPartyId(0);
    setHits([]);
    setLoadFrom('');
    setLoadTo('');
    setFreight('');
    setPay({ ...emptyPay, payDate: today() });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Transport name is required');
      return;
    }
    if (!loadFrom.trim() || !loadTo.trim()) {
      toast.warning('Load from and to are required');
      return;
    }
    if (freightAmt <= 0) {
      toast.warning('Enter freight amount');
      return;
    }
    if (paid > freightAmt + 0.001) {
      toast.error('Paid amount exceeds freight');
      return;
    }
    if (Math.abs(paid + balance - freightAmt) > 0.02) {
      toast.error('Paid and freight amount mismatch');
      return;
    }
    const payErr = checkPayMeta(paid, bank, pay.payDate, pay.utrNo);
    if (payErr) {
      toast.warning(payErr);
      return;
    }
    setBusy(true);
    try {
      const res = transportData<{ trNo: string }>(
        await transportApi.saveBill({
          customerId: partyId || undefined,
          customerName: name.trim(),
          customerPhn: phone.trim(),
          loadFrom: loadFrom.trim(),
          loadTo: loadTo.trim(),
          freightAmount: freightAmt,
          cashPaid: cash,
          bankPaid: bank,
          balance,
          mode: Number(pay.mode),
          type: Number(pay.payType),
          payDate: pay.payDate,
          utrNo: pay.utrNo.trim(),
        })
      );
      toast.success(`Saved ${res.trNo}`);
      resetForm();
      await Promise.all([loadBills(), loadPending(), loadAllotted()]);
    } catch (err) {
      toast.error(transportError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const allot = async (payload: AllotPayload) => {
    if (!pick) return;
    if (!payload.vehicleNo || !payload.driverNo || !payload.ownerNo) {
      toast.warning('Enter vehicle, driver and owner number');
      return;
    }
    if (payload.vehFreight <= 0) {
      toast.warning('Enter vehicle freight');
      return;
    }
    const payErr = checkPayMeta(payload.cashPaid + payload.bankPaid, payload.bankPaid, payload.payDate, payload.utrNo);
    if (payErr) {
      toast.warning(payErr);
      return;
    }
    setBusy(true);
    try {
      await transportApi.allot(pick.id, payload);
      toast.success('Load allotted');
      setPick(null);
      await Promise.all([loadBills(), loadPending(), loadAllotted()]);
    } catch (err) {
      toast.error(transportError(err, 'Allot failed'));
    } finally {
      setBusy(false);
    }
  };

  const setUnloaded = async (unloaded: boolean) => {
    if (!view) return;
    setBusy(true);
    try {
      const updated = transportData<TransportBill>(await transportApi.markUnloaded(view.id, unloaded));
      setView(updated);
      toast.success(unloaded ? 'Marked unloaded' : 'Unloaded cleared');
      await loadAllotted();
    } catch (err) {
      toast.error(transportError(err, 'Could not update unloaded'));
    } finally {
      setBusy(false);
    }
  };

  const uploadBill = async (file: File) => {
    if (!view) return;
    setBusy(true);
    try {
      const updated = transportData<TransportBill>(await transportApi.uploadBillImage(view.id, file));
      setView(updated);
      toast.success('Bill uploaded');
      await loadAllotted();
    } catch (err) {
      toast.error(transportError(err, 'Upload failed'));
    } finally {
      setBusy(false);
    }
  };

  const filteredBills = useMemo(
    () =>
      bills.filter((r) =>
        [r.trNo, r.name, r.phone, r.loadFrom, r.loadTo].join(' ').toLowerCase().includes(search.toLowerCase())
      ),
    [bills, search]
  );

  return (
    <div className="mst-page trb-page">
      <div className="trb-head">
        <div>
          <h2 className="mst-title">
            <i className="fas fa-truck" /> Transport
          </h2>
          <p className="trb-sub">Book a load, collect freight, then allot the vehicle</p>
        </div>
        <div className="trb-tabs" role="tablist">
          <button type="button" className={tab === 'transport' ? 'on' : ''} onClick={() => setTab('transport')}>
            Transport
          </button>
          <button type="button" className={tab === 'allotments' ? 'on' : ''} onClick={() => setTab('allotments')}>
            Pending Allotments
            {pending.length > 0 && <em>{pending.length}</em>}
          </button>
          <button type="button" className={tab === 'allotted' ? 'on' : ''} onClick={() => setTab('allotted')}>
            Allotted List
            {allotted.length > 0 && <em>{allotted.length}</em>}
          </button>
        </div>
      </div>

      {tab === 'transport' && (
        <>
          <form className="mst-card trb-form" onSubmit={onSubmit}>
            <div className="mst-card-h">
              <span>
                <i className="fas fa-plus-circle" /> New Transport Bill
              </span>
            </div>
            <div className="mst-card-b">
              <div className="trb-grid">
                <label className="trb-fg trb-suggest-wrap">
                  <span>
                    Transport Name <i className="req">*</i>
                  </span>
                  <input
                    className="trb-inp"
                    value={name}
                    placeholder="Type to search"
                    onChange={(e) => {
                      setName(e.target.value);
                      setPartyId(0);
                      searchParties(e.target.value);
                    }}
                  />
                  {hits.length > 0 && (
                    <div className="trb-suggest">
                      {hits.map((c) => (
                        <button key={c.id} type="button" onClick={() => pickParty(c)}>
                          {c.name}
                          {c.phone && c.phone !== '-' ? ` · ${c.phone}` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </label>
                <label className="trb-fg">
                  <span>Phone Number</span>
                  <input
                    className="trb-inp"
                    type="tel"
                    value={phone}
                    placeholder="Phone"
                    onChange={(e) => {
                      setPhone(e.target.value);
                      searchParties(undefined, e.target.value);
                    }}
                  />
                </label>
                <label className="trb-fg">
                  <span>
                    Load From <i className="req">*</i>
                  </span>
                  <input className="trb-inp" value={loadFrom} placeholder="From" onChange={(e) => setLoadFrom(e.target.value)} />
                </label>
                <label className="trb-fg">
                  <span>
                    Load To <i className="req">*</i>
                  </span>
                  <input className="trb-inp" value={loadTo} placeholder="To" onChange={(e) => setLoadTo(e.target.value)} />
                </label>
                <label className="trb-fg">
                  <span>
                    Freight <i className="req">*</i>
                  </span>
                  <input
                    className="trb-inp trb-amt"
                    inputMode="decimal"
                    value={freight}
                    placeholder="0.00"
                    onChange={(e) => setFreight(e.target.value)}
                  />
                </label>
              </div>
              <PayFields
                mode={pay.mode}
                payType={pay.payType}
                cashPaid={pay.cashPaid}
                bankPaid={pay.bankPaid}
                payDate={pay.payDate}
                utrNo={pay.utrNo}
                onMode={(mode) => setPay((p) => ({ ...p, mode }))}
                onType={(payType) => setPay((p) => ({ ...p, payType }))}
                onCash={(cashPaid) => setPay((p) => ({ ...p, cashPaid }))}
                onBank={(bankPaid) => setPay((p) => ({ ...p, bankPaid }))}
                onDate={(payDate) => setPay((p) => ({ ...p, payDate }))}
                onUtr={(utrNo) => setPay((p) => ({ ...p, utrNo }))}
              />
              <div className="trb-totals">
                <div>
                  <em>Paid</em>
                  <strong>{money(paid)}</strong>
                </div>
                <div>
                  <em>Balance</em>
                  <strong>{money(balance)}</strong>
                </div>
                <div>
                  <em>Current Balance</em>
                  <strong className={balance > 0.005 ? 'due' : ''}>{money(balance)}</strong>
                </div>
              </div>
              <div className="trb-actions">
                <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">
                  <i className="fas fa-save" /> {busy ? 'Saving…' : 'Save Transport'}
                </button>
                <button className="mst-btn mst-btn-outline" type="button" onClick={resetForm}>
                  Clear
                </button>
              </div>
            </div>
          </form>

          <div className="mst-card">
            <div className="mst-card-h">
              <span>
                <i className="fas fa-list" /> Recent Bills
              </span>
              <div className="mst-search">
                <i className="fas fa-search" />
                <input className="mst-inp" placeholder="Search TR / name / place" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="trb-desktop mst-table-wrap">
              <table className="mst-table trb-table">
                <thead>
                  <tr>
                    <th>TR No</th>
                    <th>Transport</th>
                    <th>From / To</th>
                    <th className="num">Freight</th>
                    <th className="num">Paid</th>
                    <th className="num">Current Bal</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="mst-empty">
                        No transport bills yet
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.trNo}</strong>
                        </td>
                        <td>
                          {row.name}
                          <div className="trb-muted">{row.phone}</div>
                        </td>
                        <td>
                          {row.loadFrom} → {row.loadTo}
                          {row.vehicleNo ? <div className="trb-muted">{row.vehicleNo}</div> : null}
                        </td>
                        <td className="num">{money(row.freightAmount)}</td>
                        <td className="num">{money(row.paid)}</td>
                        <td className={`num ${row.currentBalance > 0.005 ? 'due' : ''}`}>{money(row.currentBalance)}</td>
                        <td>
                          <span className={row.isAllotted ? 'trb-pill on' : 'trb-pill'}>{row.isAllotted ? 'Allotted' : 'Pending'}</span>
                        </td>
                        <td>
                          {row.date}
                          <div className="trb-muted">{row.time?.slice(0, 5)}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="trb-mobile">
              {filteredBills.length === 0 ? (
                <div className="mst-empty">No transport bills yet</div>
              ) : (
                filteredBills.map((row) => <BillCard key={row.id} bill={row} />)
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'allotments' && (
        <div className="mst-card">
          <div className="mst-card-h">
            <span>
              <i className="fas fa-clock" /> Allot a vehicle — pay vehicle hire separately from agent freight
            </span>
          </div>
          <div className="trb-desktop mst-table-wrap">
            <table className="mst-table trb-table">
              <thead>
                <tr>
                  <th>TR No</th>
                  <th>Transport</th>
                  <th>From / To</th>
                  <th className="num">Freight</th>
                  <th className="num">Paid</th>
                  <th className="num">Due</th>
                  <th>Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pending.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="mst-empty">
                      No pending allotments
                    </td>
                  </tr>
                ) : (
                  pending.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.trNo}</strong>
                      </td>
                      <td>
                        {row.name}
                        <div className="trb-muted">{row.phone}</div>
                      </td>
                      <td>
                        {row.loadFrom} → {row.loadTo}
                      </td>
                      <td className="num">{money(row.freightAmount)}</td>
                      <td className="num">{money(row.paid)}</td>
                      <td className={`num ${row.currentBalance > 0.005 ? 'due' : ''}`}>{money(row.currentBalance)}</td>
                      <td>{row.date}</td>
                      <td>
                        <button className="mst-btn mst-btn-primary" type="button" onClick={() => setPick(row)}>
                          Allot
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="trb-mobile">
            {pending.length === 0 ? (
              <div className="mst-empty">No pending allotments</div>
            ) : (
              pending.map((row) => <BillCard key={row.id} bill={row} actionLabel="Allot" onAction={() => setPick(row)} />)
            )}
          </div>
        </div>
      )}

      {tab === 'allotted' && (
        <div className="mst-card">
          <div className="mst-card-h">
            <span>
              <i className="fas fa-check-circle" /> Allotted loads — mark unloaded and upload bill
            </span>
          </div>
          <div className="trb-desktop mst-table-wrap">
            <table className="mst-table trb-table">
              <thead>
                <tr>
                  <th>TR No</th>
                  <th>Transport</th>
                  <th>Vehicle</th>
                  <th>From / To</th>
                  <th>Status</th>
                  <th>Bill</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {allotted.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="mst-empty">
                      No allotted loads
                    </td>
                  </tr>
                ) : (
                  allotted.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.trNo}</strong>
                      </td>
                      <td>
                        {row.name}
                        <div className="trb-muted">{row.phone}</div>
                      </td>
                      <td>
                        {row.vehicleNo || '—'}
                        <div className="trb-muted">{row.driverNo || ''}</div>
                      </td>
                      <td>
                        {row.loadFrom} → {row.loadTo}
                      </td>
                      <td>
                        <span className={row.isUnloaded ? 'trb-pill on' : 'trb-pill'}>
                          {row.isUnloaded ? 'Unloaded' : 'Allotted'}
                        </span>
                      </td>
                      <td>{row.billImage ? 'Yes' : '—'}</td>
                      <td>
                        <button className="mst-btn mst-btn-primary" type="button" onClick={() => setView(row)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="trb-mobile">
            {allotted.length === 0 ? (
              <div className="mst-empty">No allotted loads</div>
            ) : (
              allotted.map((row) => (
                <BillCard key={row.id} bill={row} actionLabel="Open" onAction={() => setView(row)} />
              ))
            )}
          </div>
        </div>
      )}

      {pick && <AllotDialog bill={pick} busy={busy} onClose={() => setPick(null)} onConfirm={allot} />}
      {view && (
        <AllottedDialog
          bill={view}
          busy={busy}
          onClose={() => setView(null)}
          onUnload={setUnloaded}
          onUpload={uploadBill}
        />
      )}
    </div>
  );
};

export default TransportPage;
