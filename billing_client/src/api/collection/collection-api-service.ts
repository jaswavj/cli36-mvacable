import HttpClientWrapper from '../http-client-wrapper';
import type { CableCustomer } from '../customer/customer-api-service';

export type PayMode = 'cash' | 'upi';

export type CollectionMonth = {
  month: string;
  label: string;
  paid: boolean;
  recharged?: boolean;
  paidDate?: string;
  paidDateIso?: string;
  rechargeDate?: string;
  payMode?: string;
  due?: number;
  paidAmount?: number;
  balance?: number;
  amount?: number;
};

export type CollectionPayment = {
  id: number;
  month: string;
  monthLabel: string;
  amount: number;
  payMode?: string;
  paidDate?: string;
  paidTime?: string;
  rechargeDate?: string;
  collectedBy?: string;
};

export type CollectionReceipt = {
  id: number;
  receiptNo: string;
  printType?: number;
  printerName?: string;
  companyName?: string;
  companyAddress?: string;
  companyGstin?: string;
  companyBankDetails?: string;
  customerType?: string;
  customerId: string;
  customerName?: string;
  mobile?: string;
  address?: string;
  area?: string;
  joiningDate?: string;
  month?: string;
  monthLabel?: string;
  amount?: number;
  payMode?: string;
  paidDate?: string;
  paidTime?: string;
  due?: number;
  paidAmount?: number;
  balance?: number;
  collectedBy?: string;
  amountInWords?: string;
};

export type CollectionLookup = {
  customer: CableCustomer;
  needsRecharge?: boolean;
  pendingMonths: CollectionMonth[];
  currentMonth: CollectionMonth;
  payments?: CollectionPayment[];
  lastPaymentId?: number;
  lastAmount?: number;
};

export type CollectionReportRow = {
  id: number;
  paidDate?: string;
  paidTime?: string;
  customerType?: string;
  customerId?: string;
  customerName?: string;
  month?: string;
  monthLabel?: string;
  payMode?: string;
  amount?: number;
  collectedBy?: string;
};

export type PendingCustomer = {
  id: number;
  customerType?: string;
  customerId: string;
  name: string;
  mobile?: string;
  area?: string;
  joiningDate?: string;
  monthlyAmount?: number;
  pendingMonths?: number;
  pendingAmount?: number;
  firstPendingMonth?: string;
};

export type AccountExpense = {
  id: number;
  expenseDate?: string;
  expenseTime?: string;
  expenseFor?: string;
  amount?: number;
  userName?: string;
};

export type AccountReport = {
  collectionTotal?: number;
  expenseTotal?: number;
  finalAmount?: number;
  collectionCount?: number;
  expenseCount?: number;
  cashTotal?: number;
  upiTotal?: number;
  cableTotal?: number;
  wifiTotal?: number;
  expenses?: AccountExpense[];
};

export type PendingList = {
  rows?: PendingCustomer[];
  total?: number;
  page?: number;
  size?: number;
};

export type CollectionReport = {
  rows: CollectionReportRow[];
  count?: number;
  page?: number;
  size?: number;
  totalAmount?: number;
  cashTotal?: number;
  upiTotal?: number;
  cableTotal?: number;
  wifiTotal?: number;
};

export class CollectionApiService {
  private http = new HttpClientWrapper();

  lookup = (customerId: string) =>
    this.http.get(`/v1/cable-collections/lookup?customerId=${encodeURIComponent(customerId.trim())}`);

  save = (payload: {
    customerId: string;
    items: { month: string; amount: number; payMode: PayMode }[];
  }) => this.http.post('/v1/cable-collections', payload);

  recharge = (customerId: string) =>
    this.http.post(`/v1/cable-collections/recharge?customerId=${encodeURIComponent(customerId.trim())}`, {});

  printReceipt = (id: number) => this.http.get(`/v1/cable-collections/print/${id}`);

  dispatchPrint = (id: number) => this.http.post(`/v1/cable-collections/print/${id}`, {});

  posPrint = (id: number) => this.http.post(`/v1/cable-collections/print/${id}/pos`, {});

  pendingCustomers = (query: { type?: string; search?: string; page?: number; size?: number } = {}) => {
    const params = new URLSearchParams();
    if (query.type) params.set('type', query.type);
    if (query.search?.trim()) params.set('search', query.search.trim());
    params.set('page', String(query.page || 1));
    params.set('size', String(query.size || 25));
    return this.http.get(`/v1/cable-collections/pending-customers?${params}`);
  };

  report = (
    from: string,
    to: string,
    userId?: number,
    payMode?: string,
    customerType?: string,
    page?: number,
    size?: number
  ) => {
    const params = new URLSearchParams({ from, to });
    if (userId) params.set('userId', String(userId));
    if (payMode) params.set('payMode', payMode);
    if (customerType) params.set('customerType', customerType);
    if (page) params.set('page', String(page));
    if (size) params.set('size', String(size));
    return this.http.get(`/v1/cable-collections/report?${params}`);
  };

  account = (from: string, to: string) =>
    this.http.get(`/v1/cable-collections/account?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

  update = (id: number, payload: { amount: number; payMode: PayMode; paidDate: string; reason: string }) =>
    this.http.post(`/v1/cable-collections/${id}/update`, payload);

  cancel = (id: number, reason: string) =>
    this.http.post(`/v1/cable-collections/${id}/cancel`, { reason });

  editLog = (from: string, to: string) =>
    this.http.get(`/v1/cable-collections/edit-log?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

  dashboard = (year: number, month: number, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from && to) {
      params.set('from', from);
      params.set('to', to);
    } else {
      params.set('year', String(year));
      params.set('month', String(month));
    }
    return this.http.get(`/v1/cable-collections/dashboard?${params}`);
  };
}

export type DashboardDay = {
  date: string;
  iso?: string;
  cash?: number;
  upi?: number;
  total?: number;
};

export type DashboardCollector = {
  userId?: number;
  name?: string;
  count?: number;
  cash?: number;
  upi?: number;
  total?: number;
};

export type DashboardData = {
  year: number;
  month: number;
  from?: string;
  to?: string;
  label?: string;
  collectionTotal?: number;
  lastCollectionTotal?: number;
  collectionPct?: number;
  cashTotal?: number;
  upiTotal?: number;
  cableTotal?: number;
  wifiTotal?: number;
  collectionCount?: number;
  expenseTotal?: number;
  lastExpenseTotal?: number;
  expensePct?: number;
  expenseCount?: number;
  finalAmount?: number;
  lastFinalAmount?: number;
  finalPct?: number;
  todayCollection?: number;
  todayCount?: number;
  activeCustomers?: number;
  cableCustomers?: number;
  wifiCustomers?: number;
  pendingCustomers?: number;
  pendingAmount?: number;
  newConnections?: number;
  disconnections?: number;
  expectedAmount?: number;
  monthDueCollected?: number;
  daily?: DashboardDay[];
  collectors?: DashboardCollector[];
};

export type CollectionLog = {
  id: number;
  collectionId?: number;
  action?: string;
  customerId?: string;
  customerName?: string;
  monthLabel?: string;
  oldAmount?: number;
  newAmount?: number;
  oldPayMode?: string;
  newPayMode?: string;
  oldPaidDate?: string;
  newPaidDate?: string;
  reason?: string;
  userName?: string;
  logDate?: string;
  logTime?: string;
};

export const collectionApi = new CollectionApiService();

export const collectionData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const collectionError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
