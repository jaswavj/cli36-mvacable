import React from 'react';
import { accountApi } from '../../../api/account-reports/account-report-api-service';
import { masterApi } from '../../../api/master/master-api-service';
import LineSalesReport from './LineSalesReport';

const SalesByCategoryPage: React.FC = () => (
  <LineSalesReport
    title="Sales by Category"
    icon="fas fa-layer-group"
    filterLabel="Category"
    loadOptions={masterApi.categories}
    searchRows={accountApi.salesByCategory}
  />
);

export default SalesByCategoryPage;
