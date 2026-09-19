import HttpClientWrapper from '../http-client-wrapper';

export class BillingApiService {
  private http = new HttpClientWrapper();

  options = () => this.http.get('/v1/billing/options');
  searchProducts = (term: string) => this.http.get(`/v1/billing/products?term=${encodeURIComponent(term)}`);
  productByCode = (code: string) => this.http.get(`/v1/billing/products/by-code?code=${encodeURIComponent(code)}`);
  productByName = (name: string) => this.http.get(`/v1/billing/products/by-name?name=${encodeURIComponent(name)}`);
  productStock = (id: number) => this.http.get(`/v1/billing/products/${id}/stock`);
  productHistory = (id: number, customerId?: number) =>
    this.http.get(`/v1/billing/products/${id}/history${customerId ? `?customerId=${customerId}` : ''}`);
  searchCustomers = (query?: string, phone?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (phone) params.set('phone', phone);
    return this.http.get(`/v1/billing/customers?${params.toString()}`);
  };
  saveBill = (payload: any) => this.http.post('/v1/billing/save', payload);
  saveHold = (payload: any) => this.http.post('/v1/billing/hold', payload);
  holds = () => this.http.get('/v1/billing/holds');
  holdDetails = (id: number) => this.http.get(`/v1/billing/holds/${id}`);
  cancelHold = (id: number) => this.http.post(`/v1/billing/holds/${id}/cancel`, {});
  recentBills = () => this.http.get('/v1/billing/recent');
  printBill = (billNo: string) => this.http.get(`/v1/billing/print/${encodeURIComponent(billNo)}`);
  dispatchPrint = (billNo: string) => this.http.post(`/v1/billing/print/${encodeURIComponent(billNo)}`, {});

  posPrint = (billNo: string) => this.http.post(`/v1/billing/print/${encodeURIComponent(billNo)}/pos`, {});
}

export const billingApi = new BillingApiService();
