import HttpClientWrapper from '../http-client-wrapper';

export class StockReportApiService {
  private http = new HttpClientWrapper();

  products = () => this.http.get('/v1/stock-reports/products');
  currentStock = () => this.http.get('/v1/stock-reports/current-stock');
  transactions = (from: string, to: string, productId?: number) => {
    const params = new URLSearchParams({ from, to });
    if (productId) params.set('productId', String(productId));
    return this.http.get(`/v1/stock-reports/transactions?${params}`);
  };
  adjustments = (from: string, to: string, productId?: number, stockType?: number) => {
    const params = new URLSearchParams({ from, to });
    if (productId) params.set('productId', String(productId));
    if (stockType) params.set('stockType', String(stockType));
    return this.http.get(`/v1/stock-reports/adjustments?${params}`);
  };
}

export const stockApi = new StockReportApiService();

export const stockData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const stockError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
