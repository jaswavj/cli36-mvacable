import HttpClientWrapper from '../http-client-wrapper';

export type SalonExpenseRow = {
  id: number;
  amount: number;
  expenseFor: string;
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
  count: number;
};

export class SalonExpenseApiService {
  private http = new HttpClientWrapper();

  save = (payload: { amount: number; expenseFor: string }) =>
    this.http.post('/v1/salon-expenses', payload);

  update = (id: number, payload: { amount: number; expenseFor: string }) =>
    this.http.post(`/v1/salon-expenses/${id}/update`, payload);

  report = (from: string, to: string, shopId?: string, userId?: number) => {
    const params = new URLSearchParams({ from, to });
    if (shopId) params.set('shopId', shopId);
    if (userId) params.set('userId', String(userId));
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
