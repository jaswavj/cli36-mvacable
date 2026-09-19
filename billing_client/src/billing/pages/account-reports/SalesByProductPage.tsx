import React from 'react';
import { accountApi } from '../../../api/account-reports/account-report-api-service';
import { masterApi } from '../../../api/master/master-api-service';
import LineSalesReport from './LineSalesReport';

const SalesByProductPage: React.FC = () => (
  <LineSalesReport
    title="Sales by Product"
    icon="fas fa-cube"
    filterLabel="Product"
    loadOptions={masterApi.products}
    searchRows={accountApi.salesByItem}
  />
);

export default SalesByProductPage;
