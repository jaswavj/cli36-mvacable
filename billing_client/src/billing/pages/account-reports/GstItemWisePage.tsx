import React from 'react';
import { accountApi } from '../../../api/account-reports/account-report-api-service';
import GstDateReport from './GstDateReport';

const GstItemWisePage: React.FC = () => (
  <GstDateReport
    title="Item Wise Sales GST"
    icon="fas fa-list"
    fetchRows={accountApi.gstItemWise}
    columns={[
      { key: 'billNo', label: 'Bill No' },
      { key: 'date', label: 'Date' },
      { key: 'customer', label: 'Customer' },
      { key: 'itemName', label: 'Item' },
      { key: 'hsn', label: 'HSN' },
      { key: 'gstRate', label: 'GST %', num: true },
      { key: 'qty', label: 'Qty', num: true, total: true },
      { key: 'price', label: 'Price', num: true },
      { key: 'gross', label: 'Gross', num: true, total: true },
      { key: 'taxable', label: 'Taxable', num: true, total: true },
      { key: 'cgst', label: 'CGST', num: true, total: true },
      { key: 'sgst', label: 'SGST', num: true, total: true },
      { key: 'totalGst', label: 'Total GST', num: true, total: true },
    ]}
  />
);

export default GstItemWisePage;
