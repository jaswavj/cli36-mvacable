import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { masterApi, masterData, masterError } from '../../../api/master/master-api-service';
import './Master.css';

type Item = { id: number; name: string; code: string; mrp: number; unit: string };
type QueueItem = Item & { qty: number };

const loadJsBarcode = () =>
  new Promise<void>((resolve, reject) => {
    if ((window as any).JsBarcode) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load barcode library'));
    document.body.appendChild(script);
  });

const BarcodePage: React.FC = () => {
  const [rows, setRows] = useState<Item[]>([]);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    masterApi
      .barcodes()
      .then((res) => {
        const items = masterData<Item[]>(res) || [];
        setRows(items);
        const start: Record<number, number> = {};
        items.forEach((item) => {
          start[item.id] = 10;
        });
        setQty(start);
      })
      .catch((err) => toast.error(masterError(err, 'Could not load barcodes')));
  }, []);

  useEffect(() => {
    loadJsBarcode()
      .then(() => {
        rows.forEach((row, index) => {
          const el = document.getElementById(`barcode-${index}`);
          if (el && row.code && (window as any).JsBarcode) {
            try {
              (window as any).JsBarcode(el, String(row.code), {
                format: 'CODE128',
                displayValue: false,
                height: 18,
                width: 0.5,
              });
            } catch {
              /* ignore invalid codes */
            }
          }
        });
      })
      .catch(() => undefined);
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => [r.name, r.code].join(' ').toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const queueCount = queue.reduce((sum, item) => sum + item.qty, 0);

  const addToQueue = (item: Item) => {
    const count = qty[item.id] || 1;
    setQueue((prev) => [...prev, { ...item, qty: count }]);
    toast.success(`Added ${item.name}`);
  };

  const printQueue = async () => {
    if (queue.length === 0) {
      toast.warning('No items in queue');
      return;
    }
    try {
      await loadJsBarcode();
    } catch (err) {
      toast.error(masterError(err, 'Barcode library missing'));
      return;
    }
    const labels = queue.flatMap((item) => Array.from({ length: item.qty }, () => item));
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) {
      toast.error('Pop-up blocked. Allow pop-ups to print labels.');
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>Barcodes</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 12px; }
        .label { display: inline-block; width: 220px; border: 1px solid #ddd; padding: 8px; margin: 6px; text-align: center; }
        .name { font-size: 12px; font-weight: 700; }
        .meta { font-size: 11px; }
      </style></head><body>
      ${labels
        .map(
          (item, i) =>
            `<div class="label"><div class="name">${item.name}</div><svg id="p-${i}"></svg><div class="meta">${item.code} · ₹${Number(item.mrp || 0).toFixed(2)} · ${item.unit}</div></div>`
        )
        .join('')}
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <script>
        const items = ${JSON.stringify(labels.map((l) => l.code))};
        items.forEach((code, i) => {
          try { JsBarcode('#p-' + i, String(code || ''), { format: 'CODE128', displayValue: true, height: 36, width: 1.2, fontSize: 10 }); } catch (e) {}
        });
        setTimeout(() => window.print(), 400);
      </script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-barcode" /> Bar Code
      </h2>
      <div className="mst-card">
        <div className="mst-card-h">
          <div className="mst-search">
            <i className="fas fa-search" />
            <input className="mst-inp" placeholder="Search by item name or code..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="mst-actions" style={{ gridColumn: 'auto' }}>
            <button className="mst-btn mst-btn-primary" type="button" onClick={printQueue}>
              <i className="fas fa-print" /> Print All Queued ({queueCount})
            </button>
            <button className="mst-btn mst-btn-outline" type="button" onClick={() => setQueue([])}>
              Clear Queue
            </button>
          </div>
        </div>
        <div className="mst-table-wrap">
          <table className="mst-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Name</th>
                <th>Item Code</th>
                <th>Barcode</th>
                <th className="num">Price (MRP)</th>
                <th>Size/Unit</th>
                <th>Quantity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id}>
                  <td>{i + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.code}</td>
                  <td>
                    <svg id={`barcode-${rows.indexOf(row)}`} />
                  </td>
                  <td className="num">₹{Number(row.mrp || 0).toFixed(2)}</td>
                  <td>{row.unit}</td>
                  <td>
                    <input
                      className="mst-inp"
                      type="number"
                      min={1}
                      value={qty[row.id] ?? 10}
                      onChange={(e) => setQty({ ...qty, [row.id]: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <button className="mst-btn mst-btn-outline" type="button" onClick={() => addToQueue(row)}>
                      Add to Queue
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BarcodePage;
