import React, { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, adminData, adminError } from '../../../api/admin/admin-api-service';
import { billingApi } from '../../../api/billing/billing-api-service';
import '../master/Master.css';
import '../credit/Credit.css';
import '../BillingPage.css';

type Item = { detailId: number; prodId: number; productName: string; qty: number; price: number; disc: number; total: number; isExchanged: number };
type Bill = { billId: number; billNo: string; customerId: number; cusName: string; total: string; payable: string; paid: string; billDate: string; items: Item[] };
type Hit = { id: number; name: string; phone?: string; mrp?: number; code?: string };

const missingCustomer = (id?: number | null) => !id || Number(id) <= 1;

const ExchangePage: React.FC = () => {
  const [billNo, setBillNo] = useState('');
  const [bill, setBill] = useState<Bill | null>(null);
  const [needCustomer, setNeedCustomer] = useState(false);
  const [custOpen, setCustOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custId, setCustId] = useState(0);
  const [custHits, setCustHits] = useState<Hit[]>([]);
  const [retItem, setRetItem] = useState<Item | null>(null);
  const [retQty, setRetQty] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);

  const load = async (no = billNo) => {
    if (!no.trim()) return;
    setBusy(true);
    try {
      const data = adminData<Bill>(await adminApi.exchangeBill(no.trim()));
      setBill(data);
      const missing = missingCustomer(data.customerId);
      setNeedCustomer(missing);
      setCustOpen(missing);
      if (missing) {
        setCustName('');
        setCustPhone('');
        setCustId(0);
        setCustHits([]);
      }
    } catch (err) {
      setBill(null);
      setNeedCustomer(false);
      setCustOpen(false);
      toast.error(adminError(err, 'Bill not found'));
    } finally {
      setBusy(false);
    }
  };

  const searchCust = (query?: string, phone?: string) => {
    if ((!query || query.length < 1) && (!phone || phone.length < 2)) {
      setCustHits([]);
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try {
        const res: any = await billingApi.searchCustomers(query, phone);
        setCustHits(res?.data || []);
      } catch {
        setCustHits([]);
      }
    }, 250);
  };

  const pickCustomer = (c: Hit) => {
    setCustId(c.id);
    setCustName(c.name);
    setCustPhone(c.phone && c.phone !== '-' ? c.phone : '');
    setCustHits([]);
  };

  const assign = async () => {
    if (!bill || !custName.trim()) {
      toast.warning('Customer name is required.');
      return;
    }
    setBusy(true);
    try {
      const res = adminData<any>(await adminApi.assignCustomer({
        billId: bill.billId,
        customerId: custId,
        cusName: custName.trim(),
        cusPhn: custPhone.trim(),
      }));
      toast.success(res.message || 'Customer updated');
      setNeedCustomer(false);
      setCustOpen(false);
      await load(bill.billNo);
    } catch (err) {
      toast.error(adminError(err, 'Could not assign customer'));
    } finally {
      setBusy(false);
    }
  };

  const saveReturn = async () => {
    if (!bill || !retItem) return;
    const qty = parseFloat(retQty);
    if (!(qty > 0) || qty > retItem.qty) {
      toast.warning('Enter a valid return quantity');
      return;
    }
    setBusy(true);
    try {
      const msg = adminData<string>(await adminApi.saveReturn({
        billNo: bill.billNo,
        detailId: retItem.detailId,
        returnQty: qty,
      }));
      toast.success(msg);
      setRetItem(null);
      await load(bill.billNo);
    } catch (err) {
      toast.error(adminError(err, 'Return failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-sync" /> Product Exchange</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form" style={{ gridTemplateColumns: 'minmax(220px, 360px) auto' }}>
          <div className="mst-fg">
            <label>Bill Number</label>
            <input className="mst-inp" value={billNo} placeholder="Enter bill number…" onChange={(e) => setBillNo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          </div>
          <div className="mst-actions" style={{ alignItems: 'end' }}>
            <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={() => load()}>Load</button>
          </div>
        </div>
        {bill && (
          <div className="mst-card-b" style={{ paddingTop: 0 }}>
            <div className="mst-note">Customer: <strong>{bill.cusName}</strong> | Total: ₹{bill.total} | Payable: ₹{bill.payable} | Date: {bill.billDate}</div>
            {needCustomer && (
              <div className="mst-block">
                Customer not assigned — update the customer before exchange or return.
                <button className="mst-btn mst-btn-primary" type="button" style={{ marginLeft: 10 }} onClick={() => setCustOpen(true)}>
                  Assign Customer
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {needCustomer && bill && custOpen && (
        <div className="pos-modal-back">
          <div className="pos-modal pos-save-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-head">
              <h4>Assign Customer — Bill #{bill.billNo}</h4>
              <button className="pos-btn pos-btn-outline" type="button" onClick={() => setCustOpen(false)}>Close</button>
            </div>
            <div className="mst-note" style={{ marginBottom: 12 }}>
              This bill has no customer. Select an existing customer, or type a new name and phone to add one — same as billing.
            </div>
            <div className="pos-row" style={{ marginBottom: 12 }}>
              <div className="pos-fg" style={{ flex: 1.6, minWidth: 160 }}>
                <span className="pos-lbl">Customer Name <span className="req">*</span></span>
                <input
                  className="pos-inp pos-inp-lg"
                  value={custName}
                  placeholder="Customer name"
                  onChange={(e) => {
                    setCustName(e.target.value);
                    setCustId(0);
                    searchCust(e.target.value);
                  }}
                />
                {custHits.length > 0 && (
                  <div className="pos-suggest">
                    {custHits.map((c) => (
                      <button key={c.id} type="button" onClick={() => pickCustomer(c)}>
                        {c.name} {c.phone && c.phone !== '-' ? `· ${c.phone}` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="pos-fg" style={{ flex: 1, minWidth: 140 }}>
                <span className="pos-lbl">Phone No</span>
                <input
                  className="pos-inp pos-inp-lg"
                  value={custPhone}
                  placeholder="Phone number"
                  onChange={(e) => {
                    setCustPhone(e.target.value);
                    searchCust(undefined, e.target.value);
                  }}
                />
              </div>
            </div>
            {custId > 0 && <div className="pos-banner" style={{ marginBottom: 12 }}>Existing customer selected</div>}
            {custId <= 0 && custName.trim() !== '' && <div className="mst-note" style={{ marginBottom: 12 }}>New customer will be created on save.</div>}
            <div className="pos-acts">
              <button className="pos-btn" type="button" disabled={busy} onClick={assign}>
                {custId > 0 ? 'Assign Customer' : 'Add & Assign Customer'}
              </button>
              <button className="pos-btn pos-btn-outline" type="button" onClick={() => setCustOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {bill && (
        <div className="mst-card">
          <div className="mst-card-h">Bill Items — #{bill.billNo}</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Price</th><th>Disc</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {bill.items.map((item, i) => {
                  const exchanged = item.isExchanged === 1;
                  const returned = item.isExchanged === 2;
                  return (
                    <tr key={item.detailId} className={exchanged ? 'crd-row-adv' : returned ? 'crd-row-old' : ''}>
                      <td>{i + 1}</td>
                      <td>{item.productName}</td>
                      <td>{item.qty}</td>
                      <td>₹{item.price}</td>
                      <td>₹{item.disc}</td>
                      <td>₹{item.total}</td>
                      <td>
                        <span className={`crd-badge ${exchanged ? 'adv' : returned ? 'old' : 'col'}`}>
                          {exchanged ? 'Exchanged' : returned ? 'Returned' : 'Active'}
                        </span>
                      </td>
                      <td>
                        {exchanged || returned ? '—' : (
                          <button className="mst-icon-btn" type="button" disabled={needCustomer} onClick={() => { setRetItem(item); setRetQty(String(item.qty)); }}>
                            <i className="fas fa-undo" /> Return
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {retItem && bill && (
        <div className="crd-modal" onClick={() => setRetItem(null)}>
          <div className="crd-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="mst-card-h">Return Item</div>
            <div className="mst-card-b mst-form one-col">
              <div className="mst-note"><strong>{retItem.productName}</strong> | Available qty: {retItem.qty} | Total ₹{retItem.total}</div>
              <div className="mst-fg">
                <label>Return Quantity</label>
                <input className="mst-inp" type="number" min="0.001" max={retItem.qty} step="0.001" value={retQty} onChange={(e) => setRetQty(e.target.value)} />
              </div>
              <div className="mst-actions">
                <button className="mst-btn mst-btn-outline" type="button" onClick={() => setRetItem(null)}>Cancel</button>
                <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={saveReturn}>Yes, Return</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangePage;
