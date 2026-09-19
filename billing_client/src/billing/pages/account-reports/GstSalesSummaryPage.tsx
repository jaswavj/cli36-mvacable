import React from 'react';
import { accountApi } from '../../../api/account-reports/account-report-api-service';
import GstDateReport from './GstDateReport';

const GstSalesSummaryPage: React.FC = () => (
  <GstDateReport
    title="GST Sales Summary"
    icon="fas fa-file-invoice"
    fetchRows={accountApi.gstSalesSummary}
    columns={[
      { key: 'gstRate', label: 'GST Rate', num: true },
      { key: 'invoiceTotal', label: 'Invoice Value', num: true, total: true },
      { key: 'taxable', label: 'Taxable', num: true, total: true },
      { key: 'cgstPercent', label: 'CGST %', num: true },
      { key: 'cgst', label: 'CGST Amount', num: true, total: true },
      { key: 'sgstPercent', label: 'SGST %', num: true },
      { key: 'sgst', label: 'SGST Amount', num: true, total: true },
      { key: 'totalGst', label: 'Total GST', num: true, total: true },
      { key: 'total', label: 'Total', num: true, total: true },
    ]}
  />
);

export default GstSalesSummaryPage;
