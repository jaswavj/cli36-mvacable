import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { BillingApiService } from '../../api/billing/billing-api-service';
import { A4Invoice } from './A4Invoice';
import './PrintBill.css';

const api = new BillingApiService();
const money = (n: number) => Number(n || 0).toFixed(2);
const hasVal = (v?: string) => !!v && v !== '-';

type Line = {
  name: string;
  categoryName?: string;
  hsn?: string;
  unitName?: string;
  qty: number;
  price: number;
  discount: number;
  total: number;
  gst: number;
};

const PrintBill: React.FC = () => {
  const { billNo } = useParams();
  const [params] = useSearchParams();
  const [bill, setBill] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!billNo) return;
    api.printBill(billNo).then((res: any) => {
      if (res?.success) {
        setBill(res.data);
      } else {
        setError('Bill not found');
      }
    }).catch(() => setError('Failed to load bill'));
  }, [billNo]);

  const format = params.get('format') === 'thermal' ? 1 : params.get('format') === 'a4' ? 2 : (bill?.printType || 2);
  const isA4 = format === 2;

  useEffect(() => {
    if (!bill || !isA4) return;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [bill, isA4]);

  const calc = useMemo(() => {
    const items: Line[] = bill?.items || [];
    let amount = 0;
    let discount = 0;
    let qty = 0;
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let gst = 0;
    const byRate: Record<number, { taxable: number; cgst: number; sgst: number }> = {};
    items.forEach((item) => {
      const gstPer = Number(item.gst || 0);
      const itemTotal = Number(item.total || 0);
      const itemDisc = Number(item.discount || 0);
      const itemQty = Number(item.qty || 0);
      const taxAmt = itemTotal / (1 + gstPer / 100);
      const gstAmt = itemTotal - taxAmt;
      amount += itemTotal;
      discount += itemDisc;
      qty += itemQty;
      taxable += taxAmt;
      gst += gstAmt;
      cgst += gstAmt / 2;
      sgst += gstAmt / 2;
      if (!byRate[gstPer]) byRate[gstPer] = { taxable: 0, cgst: 0, sgst: 0 };
      byRate[gstPer].taxable += taxAmt;
      byRate[gstPer].cgst += gstAmt / 2;
      byRate[gstPer].sgst += gstAmt / 2;
    });
    const extra = Number(bill?.extraDiscount || 0);
    return {
      items, amount, discount, qty, taxable, cgst, sgst, gst, byRate,
      subTotal: amount + discount,
      finalPaid: amount - extra,
      extra,
    };
  }, [bill]);

  if (error) return <div style={{ padding: 24 }}>{error}</div>;
  if (!bill) return <div style={{ padding: 24 }}>Loading bill…</div>;

  return (
    <div className="print-page">
      {isA4 && (
        <div className="print-controls no-print">
          <button className="go" type="button" onClick={() => window.print()}>Print</button>
          <button className="stop" type="button" onClick={() => window.close()}>Cancel</button>
        </div>
      )}

      {isA4 ? (
        <A4Invoice bill={bill} />
      ) : (
        <div className="th-wrap">
          <div className="th-center">
            <div className="th-name">{bill.companyName}</div>
            <div className="th-small">{bill.companyAddress}</div>
            {hasVal(bill.companyGstin) && <div className="th-small">GSTIN: {bill.companyGstin}</div>}
          </div>
          <div className="th-solid" />
          <div className="th-row th-bold">
            <span>Bill No: {bill.billDisplay}</span>
            <span>{bill.date}</span>
          </div>
          <div className="th-dash" />
          <div className="th-small">
            <div>Customer: {bill.customerName}</div>
            {hasVal(bill.customerPhone) && <div>Phone: {bill.customerPhone}</div>}
            {hasVal(bill.customerGstin) && <div>GSTIN: {bill.customerGstin}</div>}
          </div>
          <div className="th-dash" />
          <div className="th-row th-bold th-small">
            <span style={{ width: '50%' }}>ITEM</span>
            <span style={{ width: '15%', textAlign: 'center' }}>QTY</span>
            <span style={{ width: '17%', textAlign: 'right' }}>RATE</span>
            <span style={{ width: '18%', textAlign: 'right' }}>AMT</span>
          </div>
          <div className="th-dash" />
          {calc.items.map((item, i) => (
            <div className="th-item" key={i}>
              <div className="th-bold th-small">{item.name}</div>
              <div className="th-row th-small">
                <span style={{ width: '50%' }}>{item.gst > 0 ? `GST ${item.gst}%` : ''}</span>
                <span style={{ width: '15%', textAlign: 'center' }}>{item.qty}</span>
                <span style={{ width: '17%', textAlign: 'right' }}>{money(item.price)}</span>
                <span style={{ width: '18%', textAlign: 'right' }}>{money(item.total)}</span>
              </div>
              {Number(item.discount) > 0 && <div className="th-small" style={{ textAlign: 'right' }}>Disc: -{money(item.discount)}</div>}
            </div>
          ))}
          <div className="th-solid" />
          <div className="th-row"><span>Items:</span><span>{calc.qty}</span></div>
          <div className="th-dash" />
          <div className="th-row"><span>Sub Total:</span><span>₹ {money(calc.subTotal)}</span></div>
          {calc.discount > 0 && <div className="th-row"><span>Item Discount:</span><span>- ₹ {money(calc.discount)}</span></div>}
          {calc.extra > 0 && <div className="th-row"><span>Extra Discount:</span><span>- ₹ {money(calc.extra)}</span></div>}
          <div className="th-row th-grand"><span>TOTAL:</span><span>₹ {money(calc.finalPaid)}</span></div>
          <div className="th-row"><span>Paid:</span><span>₹ {money(bill.paid)}</span></div>
          {Number(bill.balance) !== 0 && (
            <div className="th-row th-bold">
              <span>{bill.balance > 0 ? 'Balance Due:' : 'Change:'}</span>
              <span>₹ {money(Math.abs(bill.balance))}</span>
            </div>
          )}
          {calc.gst > 0 && (
            <>
              <div className="th-solid" />
              <div className="th-bold th-small">GST Summary:</div>
              {Object.keys(calc.byRate).map(Number).filter((r) => r > 0).sort((a, b) => a - b).map((rate) => (
                <div key={rate}>
                  <div className="th-row th-small"><span>GST {rate}%:</span><span>Taxable: ₹{money(calc.byRate[rate].taxable)}</span></div>
                  <div className="th-row th-small"><span style={{ marginLeft: 15 }}>CGST:</span><span>₹{money(calc.byRate[rate].cgst)}</span></div>
                  <div className="th-row th-small"><span style={{ marginLeft: 15 }}>SGST:</span><span>₹{money(calc.byRate[rate].sgst)}</span></div>
                </div>
              ))}
              <div className="th-dash" />
              <div className="th-row th-small th-bold"><span>Total GST:</span><span>₹ {money(calc.gst)}</span></div>
            </>
          )}
          <div className="th-center" style={{ marginTop: 10 }}>
            <div className="th-bold">{String(bill.amountInWords || '').toUpperCase()}</div>
            <div style={{ marginTop: 5 }}>Thank You! Visit Again</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintBill;
