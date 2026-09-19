import HttpClientWrapper from '../http-client-wrapper';

export class CreditApiService {
  private http = new HttpClientWrapper();

  customerSummary = () => this.http.get('/v1/credit/customers/summary');
  searchCustomers = (query?: string, phone?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (phone) params.set('phone', phone);
    return this.http.get(`/v1/credit/customers/search?${params.toString()}`);
  };
  customerAccount = (id: number) => this.http.get(`/v1/credit/customers/${id}`);
  saveCustomerEntry = (id: number, payload: any) => this.http.post(`/v1/credit/customers/${id}/entry`, payload);

  supplierSummary = () => this.http.get('/v1/credit/suppliers/summary');
  searchSuppliers = (query: string) =>
    this.http.get(`/v1/credit/suppliers/search?query=${encodeURIComponent(query)}`);
  supplierAccount = (id: number) => this.http.get(`/v1/credit/suppliers/${id}`);
  saveSupplierEntry = (id: number, payload: any) => this.http.post(`/v1/credit/suppliers/${id}/entry`, payload);
}

export const creditApi = new CreditApiService();

export const creditData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const creditError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
