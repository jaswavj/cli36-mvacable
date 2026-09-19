import React, { useMemo } from 'react';
import logo from '../../assets/images/logo.png';
import './PrintBill.css';

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

export const A4Invoice: React.FC<{ bill: any }> = ({ bill }) => {
  const calc = useMemo(() => {
    const items: Line[] = bill?.items || [];
    let amount = 0;
    let discount = 0;
    let qty = 0;
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
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
      cgst += gstAmt / 2;
      sgst += gstAmt / 2;
      if (!byRate[gstPer]) byRate[gstPer] = { taxable: 0, cgst: 0, sgst: 0 };
      byRate[gstPer].taxable += taxAmt;
      byRate[gstPer].cgst += gstAmt / 2;
      byRate[gstPer].sgst += gstAmt / 2;
    });
    const extra = Number(bill?.extraDiscount || 0);
    return {
      items, amount, discount, qty, taxable, cgst, sgst, byRate,
      subTotal: amount + discount,
      finalPaid: amount - extra,
      extra,
    };
  }, [bill]);

  const emptyRows = Math.max(0, 10 - calc.items.length);

  return (
    <div className="a4-wrap">
      <div className="a4-title">Tax Invoice</div>
      <div className="a4-box">
        <div className="a4-header">
          <img src={logo} alt="" />
          <div className="a4-co">
            {bill.companyName && <div className="a4-co-name">{bill.companyName}</div>}
            {(bill.companyAddress || '').split(/\r?\n/).filter(Boolean).map((line: string) => (
              <div key={line}>{line}</div>
            ))}
            {hasVal(bill.companyGstin) && <div>GSTIN: {bill.companyGstin}</div>}
          </div>
        </div>

        <div className="a4-split">
          <div className="a4-half">
            <div className="a4-h">Bill To</div>
            <div className="a4-body">
              <div className="th-bold">{bill.customerName}</div>
              {hasVal(bill.customerPhone) && <div>Ph: {bill.customerPhone}</div>}
              {hasVal(bill.customerAddress) && <div>{bill.customerAddress}</div>}
              {hasVal(bill.customerGstin) && <div>GSTIN: {bill.customerGstin}</div>}
            </div>
          </div>
          <div className="a4-half">
            <div className="a4-h a4-right">Invoice Details</div>
            <div className="a4-body a4-right">
              <div>Invoice No.: {bill.billDisplay}</div>
              <div>Date: {bill.date}</div>
              <div>Place of Supply: Tamil Nadu</div>
            </div>
          </div>
        </div>

        <table className="a4-items">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>S.No</th>
              <th style={{ width: '30%' }}>Item name</th>
              <th style={{ width: '8%' }}>HSN/SAC</th>
              <th style={{ width: '10%' }}>price/Unit</th>
              <th style={{ width: '5%' }}>Qty</th>
              <th style={{ width: '8%' }}>Taxable</th>
              <th style={{ width: '10%' }}>CGST</th>
              <th style={{ width: '10%' }}>SGST</th>
              <th style={{ width: '14%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {calc.items.map((item, i) => {
              const gstPer = Number(item.gst || 0);
              const taxAmt = Number(item.total) / (1 + gstPer / 100);
              const gstAmt = Number(item.total) - taxAmt;
              const name = item.categoryName ? `${item.categoryName} - ${item.name}` : item.name;
              return (
                <tr key={i}>
                  <td style={{ textAlign: 'center' }}>{i + 1}</td>
                  <td><b>{name}</b></td>
                  <td style={{ textAlign: 'center' }}>{item.hsn || ''}</td>
                  <td style={{ textAlign: 'right' }}>{money(item.price)}</td>
                  <td style={{ textAlign: 'center' }}>{item.qty}{item.unitName ? ` ${item.unitName}` : ''}</td>
                  <td style={{ textAlign: 'right' }}>{money(taxAmt)}</td>
                  <td style={{ textAlign: 'right' }}>{money(gstAmt / 2)}</td>
                  <td style={{ textAlign: 'right' }}>{money(gstAmt / 2)}</td>
                  <td style={{ textAlign: 'right' }}>{money(item.total)}</td>
                </tr>
              );
            })}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr className="a4-empty" key={`e${i}`}>
                {Array.from({ length: 9 }).map((__, c) => (
                  <td key={c}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ textAlign: 'right' }}>Total</td>
              <td style={{ textAlign: 'center' }}>{calc.qty}</td>
              <td style={{ textAlign: 'right' }}>{money(calc.taxable)}</td>
              <td style={{ textAlign: 'right' }}>{money(calc.cgst)}</td>
              <td style={{ textAlign: 'right' }}>{money(calc.sgst)}</td>
              <td style={{ textAlign: 'right' }}>{money(calc.amount)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="a4-taxrow">
          <div className="a4-tax">
            <div className="a4-line">
              <span>Tax details</span>
              <span>{Object.keys(calc.byRate).map((r) => `${r}.0%`).join(' ')}</span>
            </div>
            <div className="a4-line"><span>CGST</span><span>₹ {money(calc.cgst)}</span></div>
            <div className="a4-line"><span>SGST</span><span>₹ {money(calc.sgst)}</span></div>
            <div className="a4-line"><span>IGST</span><span>₹ 0.00</span></div>
          </div>
          <div className="a4-amt">
            <div className="a4-h">Amounts</div>
            <div className="a4-line"><span>Sub Total</span><span>₹ {money(calc.subTotal)}</span></div>
            {calc.discount > 0 && <div className="a4-line"><span>Item Discount</span><span>- ₹ {money(calc.discount)}</span></div>}
            {calc.extra > 0 && <div className="a4-line"><span>Extra Discount</span><span>- ₹ {money(calc.extra)}</span></div>}
            <div className="a4-line total"><span>Total</span><span>₹ {money(calc.finalPaid)}</span></div>
            <div className="a4-line"><span>Paid</span><span>₹ {money(bill.paid)}</span></div>
            <div className="a4-line"><span>Balance</span><span>₹ {money(bill.balance)}</span></div>
          </div>
        </div>

        <table className="a4-pay">
          <thead>
            <tr><th colSpan={5} className="a4-h" style={{ border: 'none' }}>Payment Summary</th></tr>
            <tr>
              <th>Date</th><th>Mode</th><th>Method</th>
              <th style={{ textAlign: 'right' }}>Paid (₹)</th>
              <th style={{ textAlign: 'right' }}>Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {(bill.payments || []).map((p: any, i: number) => (
              <tr key={i}>
                <td>{p.date}</td>
                <td>{p.mode}</td>
                <td>{p.method}</td>
                <td style={{ textAlign: 'right' }}>{money(p.paid)}</td>
                <td style={{ textAlign: 'right' }}>{money(p.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="a4-words">Amount In Words : {bill.amountInWords}</div>
        <div className="a4-foot">
          <div>
            <div className="a4-h">Terms & Conditions</div>
            <div className="a4-terms">Your Terms & Conditions Here.</div>
          </div>
          <div>
            {hasVal(bill.companyBankDetails) && (
              <>
                <div className="a4-h">Bank Details for Payment</div>
                <div className="a4-bank">
                  {bill.companyBankDetails.split(/\r?\n/).filter(Boolean).map((line: string) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="a4-brand">
        Powered by <b>JASXBILL</b> — Smart Billing Software • 8667214152
      </div>
    </div>
  );
};

export default A4Invoice;
