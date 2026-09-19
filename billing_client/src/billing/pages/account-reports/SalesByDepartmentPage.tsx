import React from 'react';
import { accountApi } from '../../../api/account-reports/account-report-api-service';
import { masterApi } from '../../../api/master/master-api-service';
import LineSalesReport from './LineSalesReport';

const SalesByDepartmentPage: React.FC = () => (
  <LineSalesReport
    title="Sales by Department"
    icon="fas fa-sitemap"
    filterLabel="Brand"
    loadOptions={masterApi.brands}
    searchRows={accountApi.salesByDepartment}
  />
);

export default SalesByDepartmentPage;
