import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { masterApi, masterData, masterError } from '../../../api/master/master-api-service';
import './Master.css';

type Option = { id: number; name: string; code: string };
type Component = { id: number; name: string; code: string; quantity: number; componentProductId: number };

const ConfigMaterialPage: React.FC = () => {
  const [products, setProducts] = useState<Option[]>([]);
  const [productId, setProductId] = useState('');
  const [componentId, setComponentId] = useState('');
  const [qty, setQty] = useState('1');
  const [rows, setRows] = useState<Component[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    masterApi
      .lookups()
      .then((res) => setProducts(masterData<any>(res).products || []))
      .catch((err) => toast.error(masterError(err, 'Could not load products')));
  }, []);

  const loadComponents = async (id: string) => {
    if (!id) {
      setRows([]);
      return;
    }
    try {
      setRows(masterData<Component[]>(await masterApi.components(Number(id))) || []);
    } catch (err) {
      toast.error(masterError(err, 'Could not load components'));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !componentId) {
      toast.warning('Select main product and component');
      return;
    }
    setBusy(true);
    try {
      await masterApi.saveComponent({
        productId: Number(productId),
        componentProductId: Number(componentId),
        quantity: Number(qty || 0),
      });
      toast.success('Component added');
      setComponentId('');
      setQty('1');
      await loadComponents(productId);
    } catch (err) {
      toast.error(masterError(err, 'Save failed'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm('Remove this component?')) return;
    try {
      await masterApi.deleteComponent(id);
      toast.info('Component removed');
      await loadComponents(productId);
    } catch (err) {
      toast.error(masterError(err, 'Delete failed'));
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title">
        <i className="fas fa-cogs" /> Config Product Material
      </h2>
      <p className="mst-note" style={{ marginBottom: 12 }}>
        Configure which products have sub-components (for example Mixie → Plug, Wire).
      </p>
      <div className="mst-grid">
        <div className="mst-card">
          <div className="mst-card-h">Add Component</div>
          <form className="mst-card-b mst-form one-col" onSubmit={onSubmit}>
            <div className="mst-fg">
              <label>Main Product</label>
              <select
                className="mst-sel"
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  loadComponents(e.target.value);
                }}
              >
                <option value="">Select Main Product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
            <div className="mst-fg">
              <label>Component Product</label>
              <select className="mst-sel" value={componentId} onChange={(e) => setComponentId(e.target.value)}>
                <option value="">Select Component</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>
            <div className="mst-fg">
              <label>Quantity</label>
              <input className="mst-inp" type="number" min="0.01" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="mst-actions">
              <button className="mst-btn mst-btn-primary" disabled={busy} type="submit">Add Component</button>
            </div>
          </form>
        </div>
        <div className="mst-card">
          <div className="mst-card-h">Components</div>
          <div className="mst-table-wrap">
            <table className="mst-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Code</th>
                  <th className="num">Qty</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="mst-empty">Select a main product to view components</td>
                  </tr>
                )}
                {rows.map((row, i) => (
                  <tr key={row.id}>
                    <td>{i + 1}</td>
                    <td>{row.name}</td>
                    <td>{row.code}</td>
                    <td className="num">{row.quantity}</td>
                    <td>
                      <button className="mst-icon-btn danger" type="button" onClick={() => remove(row.id)}>
                        <i className="fas fa-trash" />
                      </button>
                    </td>
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

export default ConfigMaterialPage;
