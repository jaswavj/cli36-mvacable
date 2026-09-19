import React from 'react';
import { accountApi } from '../../../api/account-reports/account-report-api-service';
import GstDateReport from './GstDateReport';

const GstPurchasePage: React.FC = () => (
  <GstDateReport
    title="Purchase GST"
    icon="fas fa-file-import"
    fetchRows={accountApi.gstPurchase}
    columns={[
      { key: 'invoiceNo', label: 'Invoice No' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'invoiceDate', label: 'Date' },
      { key: 'itemName', label: 'Item' },
      { key: 'purchaseAmount', label: 'Purchase', num: true, total: true },
      { key: 'taxable', label: 'Taxable', num: true, total: true },
      { key: 'gstRate', label: 'GST %', num: true },
      { key: 'cgst', label: 'CGST', num: true, total: true },
      { key: 'sgst', label: 'SGST', num: true, total: true },
      { key: 'igst', label: 'IGST', num: true, total: true },
      { key: 'total', label: 'Total', num: true, total: true },
    ]}
  />
);

export default GstPurchasePage;
