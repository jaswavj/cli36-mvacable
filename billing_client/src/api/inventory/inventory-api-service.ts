import HttpClientWrapper from '../http-client-wrapper';

export class InventoryApiService {
  private http = new HttpClientWrapper();

  suppliers = () => this.http.get('/v1/inventory/suppliers');
  saveSupplier = (payload: any) => this.http.post('/v1/inventory/suppliers', payload);
  blockSupplier = (id: number) => this.http.post(`/v1/inventory/suppliers/${id}/block`, {});

  lookups = () => this.http.get('/v1/inventory/lookups');
  searchProducts = (term: string) => this.http.get(`/v1/inventory/products?term=${encodeURIComponent(term)}`);
  productByName = (name: string) => this.http.get(`/v1/inventory/products/by-name?name=${encodeURIComponent(name)}`);
  productByCode = (code: string) => this.http.get(`/v1/inventory/products/by-code?code=${encodeURIComponent(code)}`);
  productHistory = (name: string) => this.http.get(`/v1/inventory/products/history?name=${encodeURIComponent(name)}`);

  savePurchase = (payload: any) => this.http.post('/v1/inventory/purchases', payload);
  purchaseReport = (from: string, to: string, supplierId?: number) => {
    const params = new URLSearchParams({ from, to });
    if (supplierId) params.set('supplierId', String(supplierId));
    return this.http.get(`/v1/inventory/purchases/report?${params}`);
  };
  purchaseDetails = (id: number) => this.http.get(`/v1/inventory/purchases/${id}`);

  purchaseForReturn = (search: string) => this.http.get(`/v1/inventory/returns/bill?search=${encodeURIComponent(search)}`);
  saveReturn = (payload: any) => this.http.post('/v1/inventory/returns', payload);
  returnHistory = (detailId: number) => this.http.get(`/v1/inventory/returns/history?detailId=${detailId}`);
  returnReport = (from: string, to: string, supplierId?: number) => {
    const params = new URLSearchParams({ from, to });
    if (supplierId) params.set('supplierId', String(supplierId));
    return this.http.get(`/v1/inventory/returns/report?${params}`);
  };

  paymentReport = (from: string, to: string, supplierId?: number) => {
    const params = new URLSearchParams({ from, to });
    if (supplierId) params.set('supplierId', String(supplierId));
    return this.http.get(`/v1/inventory/payments/report?${params}`);
  };
}

export const inventoryApi = new InventoryApiService();

export const invData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const invError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
