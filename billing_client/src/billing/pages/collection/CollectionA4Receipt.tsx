import React from 'react';
import logo from '../../../assets/images/logo.png';
import type { CollectionReceipt } from '../../../api/collection/collection-api-service';
import '../PrintBill.css';

const money = (n?: number) => Number(n || 0).toFixed(2);
const hasVal = (v?: string) => !!v && v !== '-';
const payLabel = (mode?: string) => (mode === 'upi' ? 'UPI' : mode === 'cash' ? 'Cash' : mode || '—');
const typeLabel = (type?: string) => (type === 'wifi' ? 'WiFi' : 'Cable');

export const CollectionA4Receipt: React.FC<{ receipt: CollectionReceipt }> = ({ receipt }) => (
  <div className="a4-wrap">
    <div className="a4-title">Collection Receipt</div>
    <div className="a4-box">
      <div className="a4-header">
        <img src={logo} alt="" />
        <div className="a4-co">
          {receipt.companyName && <div className="a4-co-name">{receipt.companyName}</div>}
          {(receipt.companyAddress || '').split(/\r?\n/).filter(Boolean).map((line) => (
            <div key={line}>{line}</div>
          ))}
          {hasVal(receipt.companyGstin) && <div>GSTIN: {receipt.companyGstin}</div>}
        </div>
      </div>

      <div className="a4-split">
        <div className="a4-half">
          <div className="a4-h">Customer</div>
          <div className="a4-body">
            <div className="th-bold">{receipt.customerName}</div>
            <div>ID: {receipt.customerId}</div>
            <div>Type: {typeLabel(receipt.customerType)}</div>
            {hasVal(receipt.mobile) && <div>Ph: {receipt.mobile}</div>}
            {hasVal(receipt.area) && <div>Area: {receipt.area}</div>}
            {hasVal(receipt.address) && <div>{receipt.address}</div>}
            {hasVal(receipt.joiningDate) && <div>Joined: {receipt.joiningDate}</div>}
          </div>
        </div>
        <div className="a4-half">
          <div className="a4-h a4-right">Receipt Details</div>
          <div className="a4-body a4-right">
            <div>Receipt No.: {receipt.receiptNo}</div>
            <div>Date: {receipt.paidDate}</div>
            {hasVal(receipt.paidTime) && <div>Time: {receipt.paidTime}</div>}
            <div>Payment: {payLabel(receipt.payMode)}</div>
            {hasVal(receipt.collectedBy) && <div>Collected By: {receipt.collectedBy}</div>}
          </div>
        </div>
      </div>

      <table className="a4-items">
        <thead>
          <tr>
            <th>Month</th>
            <th>Mode</th>
            <th>Due (₹)</th>
            <th>Paid Now (₹)</th>
            <th>Total Paid (₹)</th>
            <th>Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><b>{receipt.monthLabel}</b></td>
            <td style={{ textAlign: 'center' }}>{payLabel(receipt.payMode)}</td>
            <td style={{ textAlign: 'right' }}>{money(receipt.due)}</td>
            <td style={{ textAlign: 'right' }}><b>{money(receipt.amount)}</b></td>
            <td style={{ textAlign: 'right' }}>{money(receipt.paidAmount)}</td>
            <td style={{ textAlign: 'right' }}>{money(receipt.balance)}</td>
          </tr>
        </tbody>
      </table>

      <div className="a4-words">Amount In Words : {receipt.amountInWords}</div>
      <div className="a4-foot">
        <div>
          <div className="a4-h">Notes</div>
          <div className="a4-terms">This is a collection receipt for cable / WiFi monthly charges.</div>
        </div>
        <div>
          {hasVal(receipt.companyBankDetails) && (
            <>
              <div className="a4-h">Bank Details for Payment</div>
              <div className="a4-bank">
                {receipt.companyBankDetails.split(/\r?\n/).filter(Boolean).map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </>
          )}
          <div className="a4-h">Authorized Signatory</div>
          <div className="a4-terms" />
        </div>
      </div>
    </div>
    <div className="a4-brand">
      Powered by <b>JASXBILL</b> — Smart Billing Software • 8667214152
    </div>
  </div>
);

export default CollectionA4Receipt;
