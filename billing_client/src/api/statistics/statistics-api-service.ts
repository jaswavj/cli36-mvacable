import HttpClientWrapper from '../http-client-wrapper';

export class StatisticsApiService {
  private http = new HttpClientWrapper();

  profit = (from: string, to: string, type?: string) => {
    const params = new URLSearchParams({ from, to });
    if (type) params.set('type', type);
    return this.http.get(`/v1/statistics/profit?${params}`);
  };
  dashboard = (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    return this.http.get(`/v1/statistics/dashboard?${params}`);
  };
  categorySales = (from: string, to: string) =>
    this.http.get(`/v1/statistics/category-sales?from=${from}&to=${to}`);
  categoryProducts = (catId: number, from: string, to: string) =>
    this.http.get(`/v1/statistics/category-sales/${catId}/products?from=${from}&to=${to}`);
  productAnalysis = (prodId: number, from: string, to: string) =>
    this.http.get(`/v1/statistics/product-analysis?prodId=${prodId}&from=${from}&to=${to}`);
  balanceSummary = (from: string, to: string) =>
    this.http.get(`/v1/statistics/balance-summary?from=${from}&to=${to}`);
}

export const statsApi = new StatisticsApiService();

export const statsData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const statsError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
