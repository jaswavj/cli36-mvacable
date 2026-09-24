import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { stockApi, stockData, stockError, type StockProduct } from '../../../api/stock/stock-api-service';
import '../master/Master.css';
import '../quick-bill/QuickBill.css';

type Tab = 'in' | 'sale';

const n = (v?: number) => Number(v || 0).toFixed(2);

const StockMovePage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('sale');
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setProducts(stockData<StockProduct[]>(await stockApi.products()) || []);
    } catch (err) {
      toast.error(stockError(err, 'Could not load products'));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const selected = products.find((p) => String(p.id) === productId);

  const onProduct = (id: string) => {
    setProductId(id);
    const product = products.find((p) => String(p.id) === id);
    setRate(product ? String(product.rate ?? '') : '');
  };

  const reset = () => {
    setProductId('');
    setQty('');
    setRate('');
    setNotes('');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      toast.warning('Select a product');
      return;
    }
    const nextQty = Number(qty);
    const nextRate = Number(rate);
    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      toast.warning('Enter a valid quantity');
      return;
    }
    if (!Number.isFinite(nextRate) || nextRate < 0) {
      toast.warning('Enter a valid rate');
      return;
    }
    setBusy(true);
    try {
      if (tab === 'in') {
        await stockApi.addStock({ productId: selected.id, qty: nextQty, rate: nextRate, notes: notes.trim() });
        toast.success('Stock added');
      } else {
        await stockApi.saveSale({ productId: selected.id, qty: nextQty, rate: nextRate, notes: notes.trim() });
        toast.success('Sale saved');
      }
      reset();
      await refresh();
    } catch (err) {
      toast.error(stockError(err, tab === 'in' ? 'Could not add stock' : 'Could not save sale'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page qb-report-page">
      <h2 className="mst-title">
        <i className="fas fa-exchange-alt" /> Sale / Add Stock
      </h2>
      <div className="qb-tabs" role="tablist">
        <button
          type="button"
          className={tab === 'in' ? 'on' : ''}
          onClick={() => {
            setTab('in');
            reset();
          }}
        >
          Add Stock
        </button>
        <button
          type="button"
          className={tab === 'sale' ? 'on' : ''}
          onClick={() => {
            setTab('sale');
            reset();
          }}
        >
          Sale
        </button>
      </div>

      <div className="qb-page" style={{ padding: 0 }}>
        <form className="qb-card" onSubmit={onSubmit}>
          <header className="qb-head">
            <h2>{tab === 'in' ? 'Add Stock' : 'Sale'}</h2>
            <p>
              {tab === 'in'
                ? 'Select a product, add quantity and price. Changed price updates the product rate.'
                : 'Select a product. Rate comes automatically and can be changed.'}
            </p>
          </header>

          <label className="qb-label">Product</label>
          <select className="mst-inp" value={productId} onChange={(e) => onProduct(e.target.value)}>
            <option value="">Select product</option>
            {products.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · Stock {Number(row.qty || 0)} · ₹ {n(row.rate)}
              </option>
            ))}
          </select>

          {tab === 'sale' && selected && (
            <div className="mst-note">Available stock: {Number(selected.qty || 0)}</div>
          )}

          <label className="qb-label">{tab === 'in' ? 'Price' : 'Rate'}</label>
          <input
            className="mst-inp"
            type="number"
            min="0"
            step="0.01"
            placeholder="0"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />

          <label className="qb-label">Qty</label>
          <input
            className="mst-inp"
            type="number"
            min="0"
            step="0.001"
            placeholder="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />

          <label className="qb-label">Notes</label>
          <textarea
            className="mst-area"
            rows={2}
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {tab === 'sale' && Number(qty) > 0 && Number(rate) >= 0 && (
            <div className="mst-note">
              Amount: ₹ {n(Number(qty) * Number(rate))}
            </div>
          )}

          <button className="mst-btn mst-btn-primary" type="submit" disabled={busy}>
            <i className="fas fa-save" /> {busy ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StockMovePage;
