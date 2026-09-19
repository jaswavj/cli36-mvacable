import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { orderApi, orderData, orderError } from '../../../api/orders/order-list-api-service';
import '../master/Master.css';

type OrderRow = {
  id: number; orderNo: string; tableName: string; date: string; time: string;
  isDelivered: number; isBilled: number;
};
type ItemRow = {
  id: number; productName: string; code: string; qty: number; price: number; total: number; isDelivered: number;
};
type Detail = OrderRow & { items: ItemRow[]; grandTotal: number };

const TYPES = [
  { id: 'pending', label: 'Pending' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'billed', label: 'Billed' },
] as const;

const n2 = (v?: number) => Number(v || 0).toFixed(2);

const OrderListPage: React.FC = () => {
  const [type, setType] = useState<(typeof TYPES)[number]['id']>('pending');
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (nextType = type) => {
    try {
      setRows(orderData<OrderRow[]>(await orderApi.list(nextType)) || []);
    } catch (err) {
      toast.error(orderError(err, 'Could not load orders'));
    }
  }, [type]);

  useEffect(() => {
    load(type);
  }, [load, type]);

  useEffect(() => {
    if (type !== 'pending') return undefined;
    const timer = window.setInterval(() => load('pending'), 30000);
    return () => window.clearInterval(timer);
  }, [type, load]);

  const openDetail = async (id: number) => {
    try {
      setDetail(orderData<Detail>(await orderApi.detail(id)));
    } catch (err) {
      toast.error(orderError(err, 'Could not load order details'));
    }
  };

  const markOrder = async (id: number) => {
    if (!window.confirm('Mark all items in this order as delivered?')) return;
    setBusy(true);
    try {
      orderData(await orderApi.markOrderDelivered(id));
      toast.success('Order marked as delivered');
      setDetail(null);
      await load('pending');
    } catch (err) {
      toast.error(orderError(err, 'Could not update order'));
    } finally {
      setBusy(false);
    }
  };

  const markItem = async (detailId: number, orderId: number) => {
    setBusy(true);
    try {
      orderData(await orderApi.markItemDelivered(detailId));
      toast.success('Item marked as delivered');
      await openDetail(orderId);
      await load(type);
    } catch (err) {
      toast.error(orderError(err, 'Could not update item'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-list-alt" /> Order List</h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`mst-btn ${type === t.id ? 'mst-btn-primary' : 'mst-btn-outline'}`}
              onClick={() => { setType(t.id); setDetail(null); }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mst-grid">
        <div className="mst-card">
          <div className="mst-card-h">{TYPES.find((t) => t.id === type)?.label} Orders</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>Order No</th>
                  <th>Table</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={5} className="mst-empty">No {type} orders.</td></tr>}
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.orderNo}</td>
                    <td>{row.tableName}</td>
                    <td>{row.date}</td>
                    <td>{row.time}</td>
                    <td>
                      <button className="mst-btn mst-btn-outline" type="button" onClick={() => openDetail(row.id)}>View</button>
                      {type === 'pending' && (
                        <button className="mst-btn mst-btn-green" type="button" disabled={busy} style={{ marginLeft: 6 }} onClick={() => markOrder(row.id)}>
                          Mark Delivered
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mst-card">
          <div className="mst-card-h">Order Details</div>
          {!detail && <div className="mst-card-b" style={{ color: 'var(--color-text-muted)' }}>Select an order to view items.</div>}
          {detail && (
            <>
              <div className="mst-card-b">
                <div><strong>Order:</strong> {detail.orderNo}</div>
                <div><strong>Table:</strong> {detail.tableName}</div>
                <div><strong>Date:</strong> {detail.date} <strong>Time:</strong> {detail.time}</div>
              </div>
              <div className="mst-table-wrap">
                <table className="mst-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="num">Qty</th>
                      <th className="num">Price</th>
                      <th className="num">Total</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.productName}<div className="mst-note">{item.code}</div></td>
                        <td className="num">{n2(item.qty)}</td>
                        <td className="num">{n2(item.price)}</td>
                        <td className="num">{n2(item.total)}</td>
                        <td>
                          <span style={{ color: item.isDelivered ? '#166534' : '#b45309', fontWeight: 700 }}>
                            {item.isDelivered ? 'Delivered' : 'Pending'}
                          </span>
                        </td>
                        <td>
                          {!item.isDelivered && type !== 'billed' && (
                            <button className="mst-btn mst-btn-green" type="button" disabled={busy} onClick={() => markItem(item.id, detail.id)}>
                              Deliver
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={3}><strong>Grand Total</strong></td>
                      <td className="num"><strong>{n2(detail.grandTotal)}</strong></td>
                      <td colSpan={2} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderListPage;
