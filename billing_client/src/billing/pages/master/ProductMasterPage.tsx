import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { masterApi, masterData, masterError } from '../../../api/master/master-api-service';
import { useHeadings } from './useHeadings';
import './Master.css';

type Named = { id: number; name: string };
type BulkRow = {
  id: number;
  name: string;
  code: string;
  gst: number;
  categoryName: string;
  mrp: number;
  batchId: number;
  cost: number;
  brandName: string;
};

const ProductMasterPage: React.FC = () => {
  const heads = useHeadings();
  const [categories, setCategories] = useState<Named[]>([]);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    masterApi
      .lookups()
      .then((res) => setCategories(masterData<any>(res).categories || []))
      .catch(() => undefined);
    search();
  }, []);

  const search = async () => {
    try {
      setRows(masterData<BulkRow[]>(await masterApi.bulkProducts(name, categoryId ? Number(categoryId) : undefined)) || []);
    } catch (err) {
      toast.error(masterError(err, 'Could not load products'));
    }
  };

  const updateRow = (index: number, patch: Partial<BulkRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const saveAll = async () => {
    if (rows.length === 0) {
      toast.warning('No products to update');
      return;
    }
    setBusy(true);
    try {
      const res = await masterApi.bulkUpdate(
        rows.map((r) => ({
          productId: r.id,
          batchId: r.batchId,
          code: r.code,
          cost: Number(r.cost),
          mrp: Number(r.mrp),
          gst: Number(r.gst),
        }))
      );
      toast.success(`Updated ${masterData<number>(res)} products`);
      await search();
    } catch (err) {
      toast.error(masterError(err, 'Bulk update failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-boxes" /> Product Master
      </h2>
      <div className="mst-card" style={{ marginBottom: 12 }}>
        <div className="mst-card-b mst-form">
          <div className="mst-fg">
            <label>Product name</label>
            <input className="mst-inp" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mst-fg">
            <label>Filter by {heads.head1}</label>
            <select className="mst-sel" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-outline" type="button" onClick={search}>Search</button>
            <button className="mst-btn mst-btn-primary" type="button" disabled={busy} onClick={saveAll}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
      <div className="mst-card">
        <div className="mst-card-h">{heads.head3} price / code update</div>
        <div className="mst-table-wrap">
          <table className="mst-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Code</th>
                <th>{heads.head1}</th>
                <th>{heads.head2}</th>
                <th className="num">Cost</th>
                <th className="num">MRP</th>
                <th>GST</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.id}-${row.batchId}`}>
                  <td>{i + 1}</td>
                  <td>{row.name}</td>
                  <td>
                    <input className="mst-inp" value={row.code || ''} onChange={(e) => updateRow(i, { code: e.target.value })} />
                  </td>
                  <td>{row.categoryName}</td>
                  <td>{row.brandName}</td>
                  <td>
                    <input className="mst-inp" type="number" step="0.001" value={row.cost} onChange={(e) => updateRow(i, { cost: Number(e.target.value) })} />
                  </td>
                  <td>
                    <input className="mst-inp" type="number" step="0.001" value={row.mrp} onChange={(e) => updateRow(i, { mrp: Number(e.target.value) })} />
                  </td>
                  <td>
                    <select className="mst-sel" value={row.gst} onChange={(e) => updateRow(i, { gst: Number(e.target.value) })}>
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
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

export default ProductMasterPage;
