import React, { useEffect, useState } from 'react';
import { transportApi, transportData } from '../../../api/transport/transport-api-service';
import billingConfig from '../../../billingConfig';

export type TransportParty = { id: number; name: string; phone: string };

export type TransportBill = {
  id: number;
  trNo: string;
  customerId: number;
  name: string;
  phone: string;
  loadFrom: string;
  loadTo: string;
  vehicleNo?: string;
  driverNo?: string;
  ownerNo?: string;
  payDate?: string;
  utrNo?: string;
  freightAmount: number;
  paid: number;
  cashPaid: number;
  bankPaid: number;
  balance: number;
  currentBalance: number;
  vehFreight?: number;
  vehPaid?: number;
  vehBalance?: number;
  vehPayDate?: string;
  vehUtrNo?: string;
  paymentMode: number;
  paymentType: number;
  isAllotted: number;
  isUnloaded?: number;
  billImage?: string;
  uid: number;
  userName: string;
  date: string;
  time: string;
};

export type PayPayload = {
  cashPaid: number;
  bankPaid: number;
  mode: number;
  type: number;
  payDate: string;
  utrNo: string;
};

export type AllotPayload = PayPayload & {
  vehicleNo: string;
  driverNo: string;
  ownerNo: string;
  vehFreight: number;
  balance: number;
};

export type TransportPayment = {
  txnType?: string;
  date?: string;
  time?: string;
  utrNo?: string;
  amount?: number;
  cashPaid?: number;
  bankPaid?: number;
  balance?: number;
  payMode?: number;
};

export const money = (n?: number | null) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const num = (n?: number | null) => Number(n || 0).toFixed(2);

export const today = () => new Date().toISOString().slice(0, 10);

export const payDateLabel = (value?: string | null) => {
  if (!value) return '—';
  const part = value.slice(0, 10);
  const [y, m, d] = part.split('-');
  return y && m && d ? `${d}-${m}-${y}` : part;
};

const payKindLabel = (txnType?: string, isVehicle?: boolean) => {
  if (txnType === 'BILL') return 'Booking';
  if (txnType === 'COLLECTION') return 'Collection';
  if (txnType === 'VEHICLE') return 'Vehicle pay';
  return isVehicle ? 'Vehicle pay' : 'Payment';
};

const buildPaidRows = (history: TransportPayment[], bill: TransportBill, isVehicle: boolean): TransportPayment[] => {
  const rows = [...history];
  if (isVehicle) {
    if (rows.length === 0 && Number(bill.vehPaid) > 0.005) {
      return [
        {
          txnType: 'VEHICLE',
          date: bill.vehPayDate,
          utrNo: bill.vehUtrNo,
          amount: bill.vehPaid,
          balance: bill.vehBalance,
        },
      ];
    }
    return rows;
  }
  const bookingPaid = Number(bill.freightAmount || 0) - Number(bill.balance || 0);
  if (!rows.some((r) => r.txnType === 'BILL') && bookingPaid > 0.005) {
    rows.unshift({
      txnType: 'BILL',
      date: bill.payDate,
      utrNo: bill.utrNo,
      amount: bookingPaid,
      balance: bill.balance,
    });
  }
  if (rows.length === 0 && Number(bill.paid) > 0.005) {
    return [
      {
        txnType: 'BILL',
        date: bill.payDate,
        utrNo: bill.utrNo,
        amount: bill.paid,
        balance: bill.currentBalance,
      },
    ];
  }
  return rows;
};

export const billImageNames = (bill?: TransportBill | null) =>
  (bill?.billImage || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const billImageUrl = (billId: number, filename: string) =>
  `${billingConfig.apiBaseName}/api/v1/transport/images/${billId}/${encodeURIComponent(filename)}`;

export const fillMode = (mode: string, freight: number) => {
  if (mode === '1') return { cash: num(freight), bank: '0', balance: '0' };
  if (mode === '2') return { cash: '0', bank: num(freight), balance: '0' };
  return { cash: num(freight), bank: '0', balance: '0' };
};

type PayState = {
  mode: string;
  payType: string;
  cashPaid: string;
  bankPaid: string;
  payDate: string;
  utrNo: string;
  onMode: (mode: string) => void;
  onType: (type: string) => void;
  onCash: (v: string) => void;
  onBank: (v: string) => void;
  onDate: (v: string) => void;
  onUtr: (v: string) => void;
};

export const PayFields: React.FC<PayState> = ({
  mode,
  payType,
  cashPaid,
  bankPaid,
  payDate,
  utrNo,
  onMode,
  onType,
  onCash,
  onBank,
  onDate,
  onUtr,
}) => (
  <div className="trb-pay-block">
    <div className="trb-pay">
      <label className="trb-fg">
        <span>Pay Mode</span>
        <select className="trb-inp" value={mode} onChange={(e) => onMode(e.target.value)}>
          <option value="1">Cash</option>
          <option value="2">Bank</option>
          <option value="3">Mixed</option>
        </select>
      </label>
      <label className="trb-fg">
        <span>Pay Type</span>
        <select className="trb-inp" value={payType} disabled={mode === '1'} onChange={(e) => onType(e.target.value)}>
          <option value="1">UPI</option>
          <option value="2">Debit Card</option>
          <option value="3">Credit Card</option>
          <option value="4">Net Banking</option>
          <option value="5">Wallet</option>
          <option value="6">Cheque</option>
        </select>
      </label>
      <label className="trb-fg">
        <span>Cash Paid</span>
        <input className="trb-inp" inputMode="decimal" value={cashPaid} disabled={mode === '2'} onChange={(e) => onCash(e.target.value)} />
      </label>
      <label className="trb-fg">
        <span>Bank Paid</span>
        <input className="trb-inp" inputMode="decimal" value={bankPaid} disabled={mode === '1'} onChange={(e) => onBank(e.target.value)} />
      </label>
    </div>
    <div className="trb-pay trb-pay-meta">
      <label className="trb-fg">
        <span>
          Payment Date <i className="req">*</i>
        </span>
        <input className="trb-inp" type="date" value={payDate} onChange={(e) => onDate(e.target.value)} />
      </label>
      <label className="trb-fg">
        <span>
          UTR Number {mode !== '1' && <i className="req">*</i>}
        </span>
        <input className="trb-inp" value={utrNo} placeholder="Bank / UPI reference" onChange={(e) => onUtr(e.target.value)} />
      </label>
    </div>
  </div>
);

export const checkPayMeta = (paid: number, bank: number, payDate: string, utrNo: string) => {
  if (paid <= 0.005) return '';
  if (!payDate) return 'Payment date is required';
  if (bank > 0.005 && !utrNo.trim()) return 'UTR number is required for bank payment';
  return '';
};

const PaidDetails: React.FC<{
  rows: TransportPayment[];
  isVehicle: boolean;
}> = ({ rows, isVehicle }) => (
  <div className="trb-paid">
    <h4>Paid details</h4>
    {rows.length === 0 ? (
      <p className="trb-paid-empty">No previous payment on this {isVehicle ? 'vehicle hire' : 'bill'}.</p>
    ) : (
      <div className="trb-paid-table-wrap">
        <table className="trb-paid-table">
          <thead>
            <tr>
              <th>Payment date</th>
              <th>UTR</th>
              <th>Paid</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.date}-${row.utrNo}-${i}`}>
                <td>
                  {payDateLabel(row.date)}
                  <small>{payKindLabel(row.txnType, isVehicle)}</small>
                </td>
                <td>{row.utrNo?.trim() || '—'}</td>
                <td>{money(row.amount)}</td>
                <td className={Number(row.balance) > 0.005 ? 'due' : ''}>{money(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

type CollectProps = {
  title: string;
  bill: TransportBill;
  confirmLabel: string;
  busy: boolean;
  kind?: 'agent' | 'vehicle';
  onClose: () => void;
  onConfirm: (payload: PayPayload) => void;
};

export const CollectDialog: React.FC<CollectProps> = ({ title, bill, confirmLabel, busy, kind = 'agent', onClose, onConfirm }) => {
  const isVehicle = kind === 'vehicle';
  const due = Math.max(0, Number(isVehicle ? bill.vehBalance : bill.currentBalance) || 0);
  const freight = isVehicle ? bill.vehFreight : bill.freightAmount;
  const already = isVehicle ? bill.vehPaid : bill.paid;
  const [mode, setMode] = useState('1');
  const [payType, setPayType] = useState('1');
  const [cashPaid, setCashPaid] = useState(num(due));
  const [bankPaid, setBankPaid] = useState('0');
  const [payDate, setPayDate] = useState(today());
  const [utrNo, setUtrNo] = useState('');
  const [history, setHistory] = useState<TransportPayment[]>([]);

  useEffect(() => {
    if (mode === '3') return;
    const filled = fillMode(mode, due);
    setCashPaid(filled.cash);
    setBankPaid(filled.bank);
  }, [due, mode]);

  useEffect(() => {
    let live = true;
    transportApi
      .payments(bill.id, kind)
      .then((res) => {
        if (!live) return;
        setHistory(transportData<TransportPayment[]>(res) || []);
      })
      .catch(() => {
        if (!live) return;
        const date = isVehicle ? bill.vehPayDate : bill.payDate;
        const utr = isVehicle ? bill.vehUtrNo : bill.utrNo;
        if (Number(already) > 0.005 || date || utr) {
          setHistory([
            {
              txnType: isVehicle ? 'VEHICLE' : 'BILL',
              date,
              utrNo: utr,
              amount: already,
              balance: due,
            },
          ]);
        }
      });
    return () => {
      live = false;
    };
  }, [bill.id, kind]);

  const cash = parseFloat(cashPaid) || 0;
  const bank = parseFloat(bankPaid) || 0;
  const paid = cash + bank;
  const left = Math.max(0, due - paid);
  const paidRows = buildPaidRows(history, bill, isVehicle);

  return (
    <div className="trb-modal" onClick={onClose}>
      <div className="trb-modal-box trb-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="trb-modal-h">
          <div>
            <h3>{title}</h3>
            <p>
              {bill.trNo} · {isVehicle ? bill.vehicleNo || bill.name : bill.name} · {bill.loadFrom} → {bill.loadTo}
            </p>
          </div>
          <button className="trb-icon" type="button" onClick={onClose} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="trb-modal-b">
          <div className="trb-sum">
            <div>
              <em>{isVehicle ? 'Vehicle freight' : 'Agent freight'}</em>
              <strong>{money(freight)}</strong>
            </div>
            <div>
              <em>{isVehicle ? 'Already paid to vehicle' : 'Already paid'}</em>
              <strong>{money(already)}</strong>
            </div>
            <div>
              <em>{isVehicle ? 'Pay now' : 'Due now'}</em>
              <strong className="due">{money(due)}</strong>
            </div>
          </div>
          <PaidDetails rows={paidRows} isVehicle={isVehicle} />
          <p className="trb-hint">Enter the new {isVehicle ? 'vehicle payment' : 'collection'} below.</p>
          <PayFields
            mode={mode}
            payType={payType}
            cashPaid={cashPaid}
            bankPaid={bankPaid}
            payDate={payDate}
            utrNo={utrNo}
            onMode={setMode}
            onType={setPayType}
            onCash={setCashPaid}
            onBank={setBankPaid}
            onDate={setPayDate}
            onUtr={setUtrNo}
          />
          <div className="trb-remain">
            After this: <strong>{money(left)}</strong> {isVehicle ? 'vehicle balance' : 'current balance'}
          </div>
        </div>
        <div className="trb-modal-f">
          <button className="mst-btn mst-btn-outline" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="mst-btn mst-btn-primary"
            type="button"
            disabled={busy || paid > due + 0.02}
            onClick={() =>
              onConfirm({
                cashPaid: cash,
                bankPaid: bank,
                mode: Number(mode),
                type: Number(payType),
                payDate,
                utrNo: utrNo.trim(),
              })
            }
          >
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

type AllotProps = {
  bill: TransportBill;
  busy: boolean;
  onClose: () => void;
  onConfirm: (payload: AllotPayload) => void;
};

export const AllotDialog: React.FC<AllotProps> = ({ bill, busy, onClose, onConfirm }) => {
  const [vehicleNo, setVehicleNo] = useState(bill.vehicleNo || '');
  const [driverNo, setDriverNo] = useState(bill.driverNo || '');
  const [ownerNo, setOwnerNo] = useState(bill.ownerNo || '');
  const [freight, setFreight] = useState('');
  const [mode, setMode] = useState('1');
  const [payType, setPayType] = useState('1');
  const [cashPaid, setCashPaid] = useState('0');
  const [bankPaid, setBankPaid] = useState('0');
  const [payDate, setPayDate] = useState(today());
  const [utrNo, setUtrNo] = useState('');

  const vehFreight = parseFloat(freight) || 0;

  useEffect(() => {
    if (mode === '3') return;
    const filled = fillMode(mode, vehFreight);
    setCashPaid(filled.cash);
    setBankPaid(filled.bank);
  }, [vehFreight, mode]);

  const cash = parseFloat(cashPaid) || 0;
  const bank = parseFloat(bankPaid) || 0;
  const vehPaid = cash + bank;
  const vehBalance = Math.max(0, vehFreight - vehPaid);

  return (
    <div className="trb-modal" onClick={onClose}>
      <div className="trb-modal-box trb-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="trb-modal-h">
          <div>
            <h3>Allot load</h3>
            <p>
              {bill.trNo} · {bill.name} · {bill.loadFrom} → {bill.loadTo}
            </p>
          </div>
          <button className="trb-icon" type="button" onClick={onClose} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="trb-modal-b">
          <div className="trb-sum">
            <div>
              <em>Agent freight</em>
              <strong>{money(bill.freightAmount)}</strong>
            </div>
            <div>
              <em>Agent paid</em>
              <strong>{money(bill.paid)}</strong>
            </div>
            <div>
              <em>Collect later</em>
              <strong className={bill.currentBalance > 0.005 ? 'due' : ''}>{money(bill.currentBalance)}</strong>
            </div>
          </div>
          <p className="trb-hint">Agent money is separate. Below is what you pay the vehicle to carry this load.</p>
          <div className="trb-grid trb-grid-3">
            <label className="trb-fg">
              <span>
                Vehicle Number <i className="req">*</i>
              </span>
              <input className="trb-inp" value={vehicleNo} placeholder="TN 23 AB 1234" onChange={(e) => setVehicleNo(e.target.value)} />
            </label>
            <label className="trb-fg">
              <span>
                Driver Number <i className="req">*</i>
              </span>
              <input className="trb-inp" type="tel" value={driverNo} placeholder="Driver mobile" onChange={(e) => setDriverNo(e.target.value)} />
            </label>
            <label className="trb-fg">
              <span>
                Vehicle Owner Number <i className="req">*</i>
              </span>
              <input className="trb-inp" type="tel" value={ownerNo} placeholder="Owner mobile" onChange={(e) => setOwnerNo(e.target.value)} />
            </label>
            <label className="trb-fg">
              <span>
                Vehicle Freight <i className="req">*</i>
              </span>
              <input className="trb-inp trb-amt" inputMode="decimal" value={freight} placeholder="Pay to vehicle" onChange={(e) => setFreight(e.target.value)} />
            </label>
          </div>
          <PayFields
            mode={mode}
            payType={payType}
            cashPaid={cashPaid}
            bankPaid={bankPaid}
            payDate={payDate}
            utrNo={utrNo}
            onMode={setMode}
            onType={setPayType}
            onCash={setCashPaid}
            onBank={setBankPaid}
            onDate={setPayDate}
            onUtr={setUtrNo}
          />
          <div className="trb-totals">
            <div>
              <em>Vehicle freight</em>
              <strong>{money(vehFreight)}</strong>
            </div>
            <div>
              <em>Paid to vehicle</em>
              <strong>{money(vehPaid)}</strong>
            </div>
            <div>
              <em>Vehicle balance</em>
              <strong className={vehBalance > 0.005 ? 'due' : ''}>{money(vehBalance)}</strong>
            </div>
          </div>
        </div>
        <div className="trb-modal-f">
          <button className="mst-btn mst-btn-outline" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="mst-btn mst-btn-primary"
            type="button"
            disabled={busy}
            onClick={() =>
              onConfirm({
                vehicleNo: vehicleNo.trim(),
                driverNo: driverNo.trim(),
                ownerNo: ownerNo.trim(),
                vehFreight,
                cashPaid: cash,
                bankPaid: bank,
                balance: vehBalance,
                mode: Number(mode),
                type: Number(payType),
                payDate,
                utrNo: utrNo.trim(),
              })
            }
          >
            {busy ? 'Saving…' : 'Allot'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const BillCard: React.FC<{
  bill: TransportBill;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ bill, actionLabel, onAction }) => (
  <article className="trb-card-item">
    <header>
      <strong>{bill.trNo}</strong>
      <span className={bill.isAllotted ? 'trb-pill on' : 'trb-pill'}>{bill.isAllotted ? 'Allotted' : 'Pending'}</span>
    </header>
    <h4>{bill.name}</h4>
    <p className="trb-route">
      <i className="fas fa-route" /> {bill.loadFrom} <i className="fas fa-arrow-right" /> {bill.loadTo}
    </p>
    {bill.vehicleNo && (
      <p className="trb-route">
        <i className="fas fa-truck" /> {bill.vehicleNo}
        {bill.driverNo ? ` · Dr ${bill.driverNo}` : ''}
      </p>
    )}
    <dl>
      <div>
        <dt>Phone</dt>
        <dd>{bill.phone || '—'}</dd>
      </div>
      <div>
        <dt>Agent freight</dt>
        <dd>{money(bill.freightAmount)}</dd>
      </div>
      <div>
        <dt>Agent paid</dt>
        <dd>{money(bill.paid)}</dd>
      </div>
      {bill.isAllotted ? (
        <>
          <div>
            <dt>Vehicle freight</dt>
            <dd>{money(bill.vehFreight)}</dd>
          </div>
          <div>
            <dt>Paid to vehicle</dt>
            <dd>{money(bill.vehPaid)}</dd>
          </div>
        </>
      ) : (
        <div>
          <dt>Collect later</dt>
          <dd className={bill.currentBalance > 0.005 ? 'due' : ''}>{money(bill.currentBalance)}</dd>
        </div>
      )}
    </dl>
    <footer>
      <span>
        {bill.date} {bill.time?.slice(0, 5)} · {bill.userName}
      </span>
      {actionLabel && onAction && (
        <button className="mst-btn mst-btn-primary" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </footer>
  </article>
);

type AllottedProps = {
  bill: TransportBill;
  busy: boolean;
  onClose: () => void;
  onUnload: (unloaded: boolean) => void;
  onUpload: (file: File) => void;
};

export const AllottedDialog: React.FC<AllottedProps> = ({ bill, busy, onClose, onUnload, onUpload }) => {
  const images = billImageNames(bill);
  return (
    <div className="trb-modal" onClick={onClose}>
      <div className="trb-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="trb-modal-h">
          <div>
            <h3>Allotted load</h3>
            <p>
              {bill.trNo} · {bill.name} · {bill.vehicleNo || 'No vehicle'} · {bill.loadFrom} → {bill.loadTo}
            </p>
          </div>
          <button className="trb-icon" type="button" onClick={onClose} aria-label="Close">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="trb-modal-b">
          <label className="trb-check">
            <input
              type="checkbox"
              checked={bill.isUnloaded === 1}
              disabled={busy}
              onChange={(e) => onUnload(e.target.checked)}
            />
            Unloaded
          </label>
          <p className="trb-hint">Tick when goods are unloaded at destination.</p>
          <label className="trb-fg">
            <span>Upload bill / photo</span>
            <input
              className="trb-inp"
              type="file"
              accept="image/*,.pdf"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = '';
              }}
            />
          </label>
          {images.length > 0 && (
            <div className="trb-thumbs">
              {images.map((file) =>
                file.toLowerCase().endsWith('.pdf') ? (
                  <a key={file} className="trb-pdf" href={billImageUrl(bill.id, file)} target="_blank" rel="noreferrer">
                    <i className="fas fa-file-pdf" /> {file}
                  </a>
                ) : (
                  <a key={file} href={billImageUrl(bill.id, file)} target="_blank" rel="noreferrer">
                    <img src={billImageUrl(bill.id, file)} alt={file} />
                  </a>
                )
              )}
            </div>
          )}
        </div>
        <div className="trb-modal-f">
          <button className="mst-btn mst-btn-outline" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
