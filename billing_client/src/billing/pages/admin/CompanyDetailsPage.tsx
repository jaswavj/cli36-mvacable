import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { adminApi, adminData, adminError } from '../../../api/admin/admin-api-service';
import { useCompanyName } from '../../../context/CompanyNameContext';
import '../master/Master.css';
import '../users/Users.css';

const empty = {
  shopName: '',
  address: '',
  gstin: '',
  printType: 1,
  printerName: '',
  bankDetails: '',
  barcodePrinter: '',
};

const CompanyDetailsPage: React.FC = () => {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const { setCompanyName } = useCompanyName();

  useEffect(() => {
    adminApi.company()
      .then((res) => setForm({ ...empty, ...adminData<typeof empty>(res) }))
      .catch((err) => toast.error(adminError(err, 'Could not load company details')));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopName.trim() || !form.address.trim()) {
      toast.warning('Please fill all required fields');
      return;
    }
    if (form.printType === 1 && !form.printerName.trim()) {
      toast.warning('Printer name is required for thermal printing');
      return;
    }
    if (form.gstin && form.gstin.trim().length !== 15) {
      toast.warning('GSTIN must be 15 characters');
      return;
    }
    setBusy(true);
    try {
      await adminApi.saveCompany({
        ...form,
        shopName: form.shopName.trim(),
        address: form.address.trim(),
        gstin: form.gstin.trim().toUpperCase(),
        printerName: form.printType === 1 ? form.printerName.trim() : '',
        bankDetails: form.bankDetails.trim(),
        barcodePrinter: form.barcodePrinter.trim(),
      });
      setCompanyName(form.shopName.trim());
      toast.success('Company details saved');
    } catch (err) {
      toast.error(adminError(err, 'Failed to save company details'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mst-page">
      <h2 className="mst-title"><i className="fas fa-building" /> Company Details</h2>
      <div className="mst-card usr-narrow" style={{ maxWidth: 700 }}>
        <div className="mst-card-h">Shop Settings</div>
        <form className="mst-card-b mst-form one-col" onSubmit={onSubmit}>
          <div className="mst-fg">
            <label>Trade Name <span className="req">*</span></label>
            <input className="mst-inp" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>Address & Phone Number <span className="req">*</span></label>
            <textarea className="mst-area" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="mst-fg">
            <label>GSTIN No</label>
            <input className="mst-inp" maxLength={15} value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
            <div className="mst-note">15 character GSTIN (optional)</div>
          </div>
          <div className="mst-fg">
            <label>Bank Details</label>
            <textarea className="mst-area" value={form.bankDetails} onChange={(e) => setForm({ ...form, bankDetails: e.target.value })} placeholder="Account Name, Account No, IFSC, Bank, Branch" />
          </div>
          <div className="mst-fg">
            <label>Print Format <span className="req">*</span></label>
            <select className="mst-sel" value={form.printType} onChange={(e) => setForm({ ...form, printType: Number(e.target.value), printerName: Number(e.target.value) === 2 ? '' : form.printerName })}>
              <option value={1}>Thermal Printer (58mm/80mm)</option>
              <option value={2}>A4 Paper</option>
            </select>
          </div>
          {form.printType === 1 && (
            <div className="mst-fg">
              <label>Printer Name <span className="req">*</span></label>
              <input className="mst-inp" value={form.printerName} onChange={(e) => setForm({ ...form, printerName: e.target.value })} placeholder="Printer share name" />
              <div className="mst-note">
                Exact Windows printer name on the billing PC, e.g. POS-80. Cloud printing uses this PC&apos;s printer. Run print-agent\start-print-agent.bat on this PC for silent thermal print.
              </div>
            </div>
          )}
          <div className="mst-fg">
            <label>Barcode Printer Name</label>
            <input className="mst-inp" value={form.barcodePrinter} onChange={(e) => setForm({ ...form, barcodePrinter: e.target.value })} />
          </div>
          <div className="mst-actions">
            <button className="mst-btn mst-btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Details'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyDetailsPage;
