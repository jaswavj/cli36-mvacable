import HttpClientWrapper from '../http-client-wrapper';

export type StockProduct = {
  id: number;
  name: string;
  rate?: number;
  notes?: string;
  qty?: number;
};

export type StockSale = {
  id: number;
  productId?: number;
  productName?: string;
  qty?: number;
  rate?: number;
  amount?: number;
  notes?: string;
  saleDate?: string;
  saleTime?: string;
  soldBy?: string;
};

export type StockSaleReport = {
  rows?: StockSale[];
  count?: number;
  totalQty?: number;
  totalAmount?: number;
};

export type StockSaleLog = {
  id: number;
  saleId?: number;
  action?: string;
  productName?: string;
  oldQty?: number;
  newQty?: number;
  oldRate?: number;
  newRate?: number;
  oldAmount?: number;
  newAmount?: number;
  reason?: string;
  userName?: string;
  logDate?: string;
  logTime?: string;
};

export class StockApiService {
  private http = new HttpClientWrapper();

  products = () => this.http.get('/v1/stock/products');

  saveProduct = (payload: { id?: number; name: string; rate: number; notes?: string }) =>
    this.http.post('/v1/stock/products', payload);

  addStock = (payload: { productId: number; qty: number; rate: number; notes?: string }) =>
    this.http.post('/v1/stock/in', payload);

  saveSale = (payload: { productId: number; qty: number; rate: number; notes?: string }) =>
    this.http.post('/v1/stock/sales', payload);

  saleReport = (from: string, to: string) =>
    this.http.get(`/v1/stock/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);

  updateSale = (id: number, payload: { qty: number; rate: number; notes?: string; reason: string }) =>
    this.http.post(`/v1/stock/sales/${id}/update`, payload);

  cancelSale = (id: number, reason: string) =>
    this.http.post(`/v1/stock/sales/${id}/cancel`, { reason });

  saleLog = (from: string, to: string) =>
    this.http.get(`/v1/stock/sales/edit-log?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
}

export const stockApi = new StockApiService();

export const stockData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const stockError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
