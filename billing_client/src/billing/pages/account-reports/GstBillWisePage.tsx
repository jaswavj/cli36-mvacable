import React from 'react';
import { accountApi } from '../../../api/account-reports/account-report-api-service';
import GstDateReport from './GstDateReport';

const GstBillWisePage: React.FC = () => (
  <GstDateReport
    title="Bill Wise Sales GST"
    icon="fas fa-receipt"
    fetchRows={accountApi.gstBillWise}
    columns={[
      { key: 'billNo', label: 'Bill No' },
      { key: 'date', label: 'Date' },
      { key: 'customer', label: 'Customer' },
      { key: 'gstin', label: 'GSTIN' },
      { key: 'taxable', label: 'Taxable', num: true, total: true },
      { key: 'cgst', label: 'CGST', num: true, total: true },
      { key: 'sgst', label: 'SGST', num: true, total: true },
      { key: 'totalGst', label: 'Total GST', num: true, total: true },
      { key: 'invoiceValue', label: 'Invoice Value', num: true, total: true },
    ]}
  />
);

export default GstBillWisePage;
