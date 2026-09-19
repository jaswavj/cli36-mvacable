import { lazy, Suspense, type ReactElement } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Login from '../login/Login';
import { routerBaseUrl } from '../billingConfig';

const MainLayout = lazy(() => import('../main-layout/MainLayout'));
const AuthGuard = lazy(() => import('../auth-guard/AuthGuard'));
const SidebarProvider = lazy(() =>
  import('../context/SidebarContext').then((m) => ({ default: m.SidebarProvider }))
);
const BillingLayout = lazy(() => import('../billing/BillingLayout'));
const ModuleAccessGuard = lazy(() => import('../billing/components/ModuleAccessGuard'));
const DefaultAppRedirect = lazy(() =>
  import('../billing/components/ModuleAccessGuard').then((m) => ({ default: m.DefaultAppRedirect }))
);
const AddCustomerPage = lazy(() => import('../billing/pages/customer/AddCustomerPage'));
const ActiveCustomerListPage = lazy(() => import('../billing/pages/customer/ActiveCustomerListPage'));
const CollectionPage = lazy(() => import('../billing/pages/collection/CollectionPage'));
const CollectionReportPage = lazy(() => import('../billing/pages/collection/CollectionReportPage'));
const CollectionDashboardPage = lazy(() => import('../billing/pages/collection/CollectionDashboardPage'));
const CreateUserPage = lazy(() => import('../billing/pages/users/CreateUserPage'));
const ModulePermissionPage = lazy(() => import('../billing/pages/users/PermissionPage'));
const ChangePasswordPage = lazy(() => import('../billing/pages/users/ChangePasswordPage'));
const CompanyDetailsPage = lazy(() => import('../billing/pages/admin/CompanyDetailsPage'));
const EditLogPage = lazy(() => import('../billing/pages/admin/EditLogPage'));
const AdminCollectionsPage = lazy(() => import('../billing/pages/admin/AdminCollectionsPage'));
const SalonExpensePage = lazy(() => import('../billing/pages/expense/SalonExpensePage'));

const guard = (element: ReactElement) => <AuthGuard component={element} />;

const AppRouter = () => {
  return (
    <Router basename={routerBaseUrl}>
      <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading…</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            element={guard(
              <SidebarProvider>
                <MainLayout />
              </SidebarProvider>
            )}
          >
            <Route path="/app" element={<BillingLayout />}>
              <Route path="users/change-password" element={<ChangePasswordPage />} />
              <Route element={<ModuleAccessGuard />}>
                <Route path="dashboard" element={<CollectionDashboardPage />} />
                <Route path="customers/add" element={<AddCustomerPage />} />
                <Route path="customers/list" element={<ActiveCustomerListPage />} />
                <Route path="collection" element={<CollectionPage />} />
                <Route path="collection/report" element={<CollectionReportPage />} />
                <Route path="expense" element={<SalonExpensePage />} />
                <Route path="users/create" element={<CreateUserPage />} />
                <Route path="users/permission" element={<ModulePermissionPage />} />
                <Route path="admin/company-details" element={<CompanyDetailsPage />} />
                <Route path="admin/collections" element={<AdminCollectionsPage />} />
                <Route path="admin/edit-log" element={<EditLogPage />} />
              </Route>
              <Route index element={<DefaultAppRedirect />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default AppRouter;
