import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { masterApi, masterData, masterError } from '../../../api/master/master-api-service';
import { useHeadings } from './useHeadings';
import './Master.css';

type Named = { id: number; name: string };
type Unit = { id: number; name: string; convertionUnit?: string; convertionCalculation?: number };
type Product = {
  id: number;
  name: string;
  code: string;
  categoryName: string;
  brandName: string;
  mrp: number;
  stock: number;
  cost: number;
  discType: number;
  discount: number;
  gst: number;
  unitId: number;
  hsn: string;
  unitName: string;
  commission: number;
  categoryId: number;
  brandId: number;
};

const emptyForm = {
  id: 0,
  categoryId: '',
  brandId: '',
  name: '',
  code: '',
  hsn: '',
  unitId: '',
  stock: '0',
  cost: '',
  mrp: '',
  commission: '0.00',
  discType: '0',
  discount: '0.00',
  gst: '0',
  blockIt: false,
};

const ProductPage: React.FC = () => {
  const heads = useHeadings();
  const [lookups, setLookups] = useState<{ categories: Named[]; brands: Named[]; units: Unit[] }>({
    categories: [],
    brands: [],
    units: [],
  });
  const [rows, setRows] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [lookupRes, productRes] = await Promise.all([masterApi.lookups(), masterApi.products()]);
      const lookup = masterData<any>(lookupRes);
      setLookups({
        categories: lookup.categories || [],
        brands: lookup.brands || [],
        units: lookup.units || [],
      });
      setRows(masterData<Product[]>(productRes) || []);
      setForm((prev) => {
        if (prev.id) return prev;
        const others = (lookup.brands || []).find((b: Named) => /other/i.test(b.name));
        const nos = (lookup.units || []).find((u: Unit) => /^(nos|pcs)$/i.test(u.name));
        return {
          ...prev,
          brandId: others ? String(others.id) : prev.brandId,
          unitId: nos ? String(nos.id) : prev.unitId,
        };
      });
    } catch (err) {
      toast.error(masterError(err, 'Could not load products'));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedUnit = useMemo(
    () => lookups.units.find((u) => String(u.id) === form.unitId),
    [lookups.units, form.unitId]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId || !form.brandId || !form.name.trim() || !form.unitId || form.cost === '' || form.mrp === '') {
      toast.warning('Please fill the required product fields');
      return;
    }
    setBusy(true);
    try {
      if (form.id && form.blockIt) {
        await masterApi.blockProduct(form.id);
        toast.info(`${heads.head3} blocked successfully`);
      } else {
        await masterApi.saveProduct({
          id: form.id || undefined,
          name: form.name.trim(),
          code: form.code,
          categoryId: Number(form.categoryId),
          brandId: Number(form.brandId),
          unitId: Number(form.unitId),
          hsn: form.hsn,
          stock: Number(form.stock || 0),
          cost: Number(form.cost),
          mrp: Number(form.mrp),
          commission: Number(form.commission || 0),
          discType: Number(form.discType),
          discount: Number(form.discount || 0),
          gst: Number(form.gst),
        });
        toast.success(form.id ? `${heads.head3} updated` : `${heads.head3} added`);
      }
      setForm(emptyForm);
      await load();
    } catch (err) {
      toast.error(masterError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const filtered = rows.filter((r) =>
    [r.name, r.code, r.categoryName, r.brandName].join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-cube" /> {heads.head3}
      </h2>
      <div className="mst-grid mst-grid-wide">
        <div className="mst-card">
          <div className="mst-card-h">
            {form.id ? `Edit ${heads.head3}` : `Add New ${heads.head3}`}
          </div>
          <form className="mst-card-b mst-form" onSubmit={onSubmit}>
            <div className="mst-fg">
              <label>{heads.head1} <span className="req">*</span></label>
              <select className="mst-sel" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">Select {heads.head1}</option>
                {lookups.categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="mst-fg">
              <label>{heads.head2} <span className="req">*</span></label>
              <select className="mst-sel" value={form.brandId} onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
                <option value="">Select {heads.head2}</option>
                {lookups.brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="mst-fg span-2">
              <label>{heads.head3} Name <span className="req">*</span></label>
              <input className="mst-inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="mst-fg">
              <label>{heads.head3} Code</label>
              <input className="mst-inp" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div className="mst-fg">
              <label>HSN Code</label>
              <input className="mst-inp" value={form.hsn} onChange={(e) => setForm({ ...form, hsn: e.target.value })} />
            </div>
            <div className="mst-fg">
              <label>Unit/Size <span className="req">*</span></label>
              <select className="mst-sel" value={form.unitId} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
                <option value="">Select Unit/Size</option>
                {lookups.units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="mst-fg">
              <label>Stock</label>
              <input className="mst-inp" type="number" min="0" step="0.01" disabled={form.id > 0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              {selectedUnit?.convertionUnit && <span className="mst-note">Conversion: {selectedUnit.convertionUnit}</span>}
            </div>
            <div className="mst-fg">
              <label>Cost Price <span className="req">*</span></label>
              <input className="mst-inp" type="number" step="0.001" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <div className="mst-fg">
              <label>MRP <span className="req">*</span></label>
              <input className="mst-inp" type="number" step="0.001" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} />
            </div>
            <div className="mst-fg">
              <label>Commission (Rs)</label>
              <input className="mst-inp" type="number" step="0.01" value={form.commission} onChange={(e) => setForm({ ...form, commission: e.target.value })} />
            </div>
            <div className="mst-fg">
              <label>Discount Type</label>
              <select
                className="mst-sel"
                value={form.discType}
                onChange={(e) => setForm({ ...form, discType: e.target.value, discount: e.target.value === '0' ? '0.00' : form.discount })}
              >
                <option value="0">Select Type</option>
                <option value="1">Rs</option>
                <option value="2">%</option>
              </select>
            </div>
            <div className="mst-fg">
              <label>Discount</label>
              <input
                className="mst-inp"
                type="number"
                step="0.01"
                readOnly={form.discType === '0'}
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
              />
            </div>
            <div className="mst-fg">
              <label>GST %</label>
              <select className="mst-sel" value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })}>
                <option value="0">0%</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>
            {form.id > 0 && (
              <label className="mst-block mst-check span-2">
                <input type="checkbox" checked={form.blockIt} onChange={(e) => setForm({ ...form, blockIt: e.target.checked })} />
                Block this {heads.head3.toLowerCase()}
              </label>
            )}
            <div className="mst-actions">
              <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">
                {form.id ? 'Update' : `Add ${heads.head3}`}
              </button>
              {form.id > 0 && (
                <button className="mst-btn mst-btn-outline" type="button" onClick={() => setForm(emptyForm)}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        <div className="mst-card">
          <div className="mst-card-h">
            <span>{heads.head3} List</span>
            <div className="mst-search">
              <i className="fas fa-search" />
              <input className="mst-inp" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Action</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th>{heads.head1}</th>
                  <th className="num">MRP</th>
                  <th className="num">Stock</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>
                      <button
                        className="mst-icon-btn"
                        type="button"
                        onClick={() =>
                          setForm({
                            id: row.id,
                            categoryId: String(row.categoryId || ''),
                            brandId: String(row.brandId || ''),
                            name: row.name,
                            code: row.code || '',
                            hsn: row.hsn || '',
                            unitId: String(row.unitId || ''),
                            stock: String(row.stock ?? 0),
                            cost: String(row.cost ?? ''),
                            mrp: String(row.mrp ?? ''),
                            commission: String(row.commission ?? 0),
                            discType: String(row.discType ?? 0),
                            discount: String(row.discount ?? 0),
                            gst: String(row.gst ?? 0),
                            blockIt: false,
                          })
                        }
                      >
                        <i className="fas fa-edit" />
                      </button>
                    </td>
                    <td>{row.name}</td>
                    <td>{row.code}</td>
                    <td>{row.categoryName}</td>
                    <td className="num">{Number(row.mrp || 0).toFixed(2)}</td>
                    <td className="num">{Number(row.stock || 0).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
