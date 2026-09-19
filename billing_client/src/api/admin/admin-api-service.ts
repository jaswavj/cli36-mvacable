import HttpClientWrapper from '../http-client-wrapper';

export class AdminApiService {
  private http = new HttpClientWrapper();

  company = () => this.http.get('/v1/admin/company');
  saveCompany = (payload: any) => this.http.post('/v1/admin/company', payload);
  users = () => this.http.get('/v1/admin/users');

  bills = (from: string, to: string, userId?: number) => {
    const params = new URLSearchParams({ from, to });
    if (userId) params.set('userId', String(userId));
    return this.http.get(`/v1/admin/bills?${params}`);
  };
  billDetail = (id: number) => this.http.get(`/v1/admin/bills/${id}`);
  updateBillDate = (id: number, newDate: string) => this.http.post(`/v1/admin/bills/${id}/date`, { newDate });
  cancelBill = (id: number, reason: string) => this.http.post(`/v1/admin/bills/${id}/cancel`, { reason });

  payment = (billNo: string) => this.http.get(`/v1/admin/payment?billNo=${encodeURIComponent(billNo)}`);
  updatePayment = (payload: any) => this.http.post('/v1/admin/payment', payload);

  exchangeBill = (billNo: string) => this.http.get(`/v1/admin/exchange?billNo=${encodeURIComponent(billNo)}`);
  exchangeProducts = (term: string) => this.http.get(`/v1/admin/exchange/products?term=${encodeURIComponent(term)}`);
  assignCustomer = (payload: any) => this.http.post('/v1/admin/exchange/customer', payload);
  saveExchange = (payload: any) => this.http.post('/v1/admin/exchange', payload);
  saveReturn = (payload: any) => this.http.post('/v1/admin/exchange/return', payload);

  dateChangeReport = (from: string, to: string) => this.http.get(`/v1/admin/reports/bill-date?from=${from}&to=${to}`);
  cancelReport = (from: string, to: string) => this.http.get(`/v1/admin/reports/cancel?from=${from}&to=${to}`);
  paymentChangeReport = (from: string, to: string) => this.http.get(`/v1/admin/reports/payment-type?from=${from}&to=${to}`);
  exchangeReport = (from: string, to: string, type?: number) => {
    const params = new URLSearchParams({ from, to });
    if (type) params.set('type', String(type));
    return this.http.get(`/v1/admin/reports/exchange?${params}`);
  };
}

export const adminApi = new AdminApiService();

export const adminData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const adminError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
