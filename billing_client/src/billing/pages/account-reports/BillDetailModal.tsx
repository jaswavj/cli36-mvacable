import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { billingApi } from '../../../api/billing/billing-api-service';
import '../BillingPage.css';
import '../master/Master.css';
import { n2 } from './reportHelpers';

type Line = {
  code?: string; name: string; categoryName?: string; hsn?: string; unitName?: string;
  qty: number; price: number; discount: number; total: number; gst: number;
};
type Pay = { date: string; mode: string; method: string; paid: number; balance: number };
type Bill = {
  billDisplay: string; customerName?: string; customerPhone?: string; customerAddress?: string; customerGstin?: string;
  date: string; time: string; priceTotal: number; productDiscount: number; extraDiscount: number;
  payable: number; paid: number; balance: number; cashPaid?: number; bankPaid?: number;
  items: Line[]; payments: Pay[];
};

type Props = { billNo: string; onClose: () => void };

const BillDetailModal: React.FC<Props> = ({ billNo, onClose }) => {
  const [bill, setBill] = useState<Bill | null>(null);

  useEffect(() => {
    let live = true;
    billingApi.printBill(billNo).then((res: any) => {
      if (!live) return;
      if (res?.success && res.data) setBill(res.data);
      else {
        toast.error('Bill not found');
        onClose();
      }
    }).catch(() => {
      if (!live) return;
      toast.error('Could not load bill details');
      onClose();
    });
    return () => { live = false; };
  }, [billNo]);

  return (
    <div className="pos-modal-back" onClick={onClose}>
      <div className="pos-modal" style={{ width: 'min(960px, 100%)' }} onClick={(e) => e.stopPropagation()}>
        <div className="pos-modal-head">
          <h4>Bill details — {bill?.billDisplay || billNo}</h4>
          <button className="pos-btn pos-btn-outline" type="button" onClick={onClose}>Close</button>
        </div>
        {!bill ? (
          <div className="mst-empty">Loading bill…</div>
        ) : (
          <>
            <div className="mst-form" style={{ marginBottom: 12 }}>
              <div className="mst-fg"><label>Customer</label><input className="mst-inp" readOnly value={bill.customerName || '-'} /></div>
              <div className="mst-fg"><label>Phone</label><input className="mst-inp" readOnly value={bill.customerPhone || '-'} /></div>
              <div className="mst-fg"><label>Date</label><input className="mst-inp" readOnly value={`${bill.date || ''} ${bill.time || ''}`.trim()} /></div>
              <div className="mst-fg"><label>GSTIN</label><input className="mst-inp" readOnly value={bill.customerGstin || '-'} /></div>
              {bill.customerAddress ? (
                <div className="mst-fg span-2"><label>Address</label><input className="mst-inp" readOnly value={bill.customerAddress} /></div>
              ) : null}
            </div>
            <div className="mst-table-wrap" style={{ maxHeight: '36vh' }}>
              <table className="mst-table">
                <thead>
                  <tr>
                    <th>#</th><th>Product</th><th>HSN</th><th>Unit</th>
                    <th className="num">Qty</th><th className="num">Price</th><th className="num">Disc</th>
                    <th className="num">GST%</th><th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(bill.items || []).length === 0 && <tr><td colSpan={9} className="mst-empty">No line items.</td></tr>}
                  {(bill.items || []).map((line, i) => (
                    <tr key={`${line.name}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{line.name}{line.code ? <div className="mst-note">{line.code}</div> : null}</td>
                      <td>{line.hsn || '-'}</td>
                      <td>{line.unitName || '-'}</td>
                      <td className="num">{n2(line.qty)}</td>
                      <td className="num">{n2(line.price)}</td>
                      <td className="num">{n2(line.discount)}</td>
                      <td className="num">{n2(line.gst)}</td>
                      <td className="num">{n2(line.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mst-form" style={{ marginTop: 12, gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div className="mst-fg"><label>Total</label><input className="mst-inp" readOnly value={n2(bill.priceTotal)} /></div>
              <div className="mst-fg"><label>Product Disc</label><input className="mst-inp" readOnly value={n2(bill.productDiscount)} /></div>
              <div className="mst-fg"><label>Extra Disc</label><input className="mst-inp" readOnly value={n2(bill.extraDiscount)} /></div>
              <div className="mst-fg"><label>Payable</label><input className="mst-inp" readOnly value={n2(bill.payable)} /></div>
              <div className="mst-fg"><label>Paid</label><input className="mst-inp" readOnly value={n2(bill.paid)} /></div>
              <div className="mst-fg"><label>Balance</label><input className="mst-inp" readOnly value={n2(bill.balance)} /></div>
              <div className="mst-fg"><label>Cash</label><input className="mst-inp" readOnly value={n2(bill.cashPaid)} /></div>
              <div className="mst-fg"><label>Bank</label><input className="mst-inp" readOnly value={n2(bill.bankPaid)} /></div>
            </div>
            {(bill.payments || []).length > 0 && (
              <div className="mst-table-wrap" style={{ maxHeight: '22vh', marginTop: 12 }}>
                <table className="mst-table">
                  <thead>
                    <tr><th>Date</th><th>Mode</th><th>Method</th><th className="num">Paid</th><th className="num">Balance</th></tr>
                  </thead>
                  <tbody>
                    {bill.payments.map((p, i) => (
                      <tr key={`${p.date}-${i}`}>
                        <td>{p.date}</td>
                        <td>{p.mode}</td>
                        <td>{p.method}</td>
                        <td className="num">{n2(p.paid)}</td>
                        <td className="num">{n2(p.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const useBillDetail = () => {
  const [billNo, setBillNo] = useState<string | null>(null);
  return {
    openBill: (no?: string | null) => {
      const value = (no || '').trim();
      if (value) setBillNo(value);
    },
    billModal: billNo ? <BillDetailModal billNo={billNo} onClose={() => setBillNo(null)} /> : null,
  };
};

export default BillDetailModal;
