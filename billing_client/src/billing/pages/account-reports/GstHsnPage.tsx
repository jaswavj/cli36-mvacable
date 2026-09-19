import React from 'react';
import { accountApi } from '../../../api/account-reports/account-report-api-service';
import GstDateReport from './GstDateReport';

const GstHsnPage: React.FC = () => (
  <GstDateReport
    title="HSN Sales GST"
    icon="fas fa-barcode"
    fetchRows={accountApi.gstHsn}
    columns={[
      { key: 'hsn', label: 'HSN' },
      { key: 'description', label: 'Description' },
      { key: 'gstRate', label: 'GST %', num: true },
      { key: 'qty', label: 'Qty', num: true, total: true },
      { key: 'taxable', label: 'Taxable', num: true, total: true },
      { key: 'cgst', label: 'CGST', num: true, total: true },
      { key: 'sgst', label: 'SGST', num: true, total: true },
      { key: 'totalGst', label: 'Total GST', num: true, total: true },
      { key: 'totalValue', label: 'Total Value', num: true, total: true },
    ]}
  />
);

export default GstHsnPage;
