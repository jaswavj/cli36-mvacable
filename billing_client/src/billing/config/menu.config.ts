import { routerPathNames } from '../../routes/routerPathNames';

export interface MenuItemConfig {
  id: string;
  name: string;
  url?: string;
  icon: string;
  moduleId?: number;
  submenus?: MenuItemConfig[];
}

/** user_modules IDs — a menu shows only if the user has that module. */
export const MENU_MODULE = {
  addCustomer: 1,
  activeCustomers: 2,
  collection: 3,
  collectionReport: 4,
  expense: 5,
  admin: 6,
  dashboard: 7,
} as const;

export const filterMenuByModules = (items: MenuItemConfig[], moduleIds: number[]): MenuItemConfig[] => {
  const allowed = new Set((moduleIds || []).map(Number));
  return items.filter((item) => item.moduleId == null || allowed.has(item.moduleId));
};

export const hasModuleAccess = (moduleIds: number[] | undefined, moduleId: number): boolean =>
  (moduleIds || []).map(Number).includes(moduleId);

export const billingMenuConfig: MenuItemConfig[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: 'fas fa-tachometer-alt',
    url: routerPathNames.dashboard,
    moduleId: MENU_MODULE.dashboard,
  },
  {
    id: 'collection',
    name: 'Collection Entry',
    icon: 'fas fa-hand-holding-usd',
    url: routerPathNames.collection,
    moduleId: MENU_MODULE.collection,
  },
  {
    id: 'add-customer',
    name: 'Add Customer',
    icon: 'fas fa-user-plus',
    url: routerPathNames.addCustomer,
    moduleId: MENU_MODULE.addCustomer,
  },
  {
    id: 'active-customers',
    name: 'Active Customer List',
    icon: 'fas fa-users',
    url: routerPathNames.activeCustomers,
    moduleId: MENU_MODULE.activeCustomers,
  },
  {
    id: 'collection-report',
    name: 'Collection Report',
    icon: 'fas fa-chart-bar',
    url: routerPathNames.collectionReport,
    moduleId: MENU_MODULE.collectionReport,
  },
  {
    id: 'expense',
    name: 'Expense',
    icon: 'fas fa-money-bill-wave',
    url: routerPathNames.expense,
    moduleId: MENU_MODULE.expense,
  },
  {
    id: 'admin',
    name: 'Admin',
    icon: 'fas fa-chart-pie',
    moduleId: MENU_MODULE.admin,
    submenus: [
      { id: 'company-details', name: 'Company Details', url: routerPathNames.admin.companyDetails, icon: 'fas fa-building' },
      { id: 'create-user', name: 'Create User', url: routerPathNames.users.create, icon: 'fas fa-user-plus' },
      { id: 'permission', name: 'Edit User / Permission', url: routerPathNames.users.permission, icon: 'fas fa-user-edit' },
      { id: 'edit-collection', name: 'Edit Collection', url: routerPathNames.admin.editCollection, icon: 'fas fa-edit' },
      { id: 'edit-log', name: 'Edit Log', url: routerPathNames.admin.editLog, icon: 'fas fa-history' },
    ],
  },
];

const firstAllowedPath = (moduleIds?: number[]): string => {
  const allowed = new Set((moduleIds || []).map(Number));
  for (const item of billingMenuConfig) {
    if (item.moduleId != null && !allowed.has(item.moduleId)) continue;
    if (item.url) return item.url;
    const sub = item.submenus?.find((s) => s.url);
    if (sub?.url) return sub.url;
  }
  return routerPathNames.collection;
};

/** After login: first menu the user is allowed to open. */
export const defaultAppPath = (moduleIds?: number[]): string => firstAllowedPath(moduleIds);

export const moduleIdForPath = (pathname: string): number | null => {
  if (pathname.includes('/app/users/change-password')) return null;
  if (pathname.includes('/app/dashboard')) return MENU_MODULE.dashboard;
  if (pathname.includes('/app/customers/add')) return MENU_MODULE.addCustomer;
  if (pathname.includes('/app/customers/list')) return MENU_MODULE.activeCustomers;
  if (pathname.includes('/app/collection/report')) return MENU_MODULE.collectionReport;
  if (pathname.includes('/app/collection')) return MENU_MODULE.collection;
  if (pathname.includes('/app/expense')) return MENU_MODULE.expense;
  if (pathname.includes('/app/users')) return MENU_MODULE.admin;
  if (pathname.includes('/app/admin')) return MENU_MODULE.admin;
  return null;
};
