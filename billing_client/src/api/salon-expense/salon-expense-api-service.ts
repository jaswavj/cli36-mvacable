import HttpClientWrapper from '../http-client-wrapper';

export type PayMode = 'cash' | 'upi';
export type CustomerType = 'cable' | 'wifi';

export type SalonExpenseRow = {
  id: number;
  amount: number;
  expenseFor: string;
  payMode?: string;
  customerType?: string;
  shopId: string;
  shopName: string;
  userId: number;
  userName: string;
  expenseDate: string;
  expenseTime: string;
};

export type SalonExpenseReport = {
  rows: SalonExpenseRow[];
  grandTotal: number;
  cashTotal?: number;
  upiTotal?: number;
  cableTotal?: number;
  wifiTotal?: number;
  count: number;
};

export class SalonExpenseApiService {
  private http = new HttpClientWrapper();

  save = (payload: { amount: number; expenseFor: string; payMode: PayMode; customerType: CustomerType }) =>
    this.http.post('/v1/salon-expenses', payload);

  update = (id: number, payload: { amount: number; expenseFor: string; payMode: PayMode; customerType: CustomerType }) =>
    this.http.post(`/v1/salon-expenses/${id}/update`, payload);

  cancel = (id: number, reason: string) =>
    this.http.post(`/v1/salon-expenses/${id}/cancel`, { reason });

  report = (
    from: string,
    to: string,
    shopId?: string,
    userId?: number,
    payMode?: string,
    customerType?: string
  ) => {
    const params = new URLSearchParams({ from, to });
    if (shopId) params.set('shopId', shopId);
    if (userId) params.set('userId', String(userId));
    if (payMode) params.set('payMode', payMode);
    if (customerType) params.set('customerType', customerType);
    return this.http.get(`/v1/salon-expenses/report?${params}`);
  };
}

export const salonExpenseApi = new SalonExpenseApiService();

export const salonExpenseData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const salonExpenseError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
