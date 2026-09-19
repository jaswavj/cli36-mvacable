import HttpClientWrapper from '../http-client-wrapper';

export class AccountReportApiService {
  private http = new HttpClientWrapper();

  sales = (from: string, to: string, mode = 0, type = 0, userId = 0) => {
    const params = new URLSearchParams({ from, to, mode: String(mode), type: String(type) });
    if (userId) params.set('userId', String(userId));
    return this.http.get(`/v1/account-reports/sales?${params}`);
  };

  salesByCategory = (from: string, to: string, categoryId: number) =>
    this.http.get(`/v1/account-reports/sales-by-category?from=${from}&to=${to}&categoryId=${categoryId}`);

  salesByDepartment = (from: string, to: string, brandId: number) =>
    this.http.get(`/v1/account-reports/sales-by-department?from=${from}&to=${to}&brandId=${brandId}`);

  salesByItem = (from: string, to: string, productId: number) =>
    this.http.get(`/v1/account-reports/sales-by-item?from=${from}&to=${to}&productId=${productId}`);

  salesByCustomer = (from: string, to: string, customerId: number) =>
    this.http.get(`/v1/account-reports/sales-by-customer?from=${from}&to=${to}&customerId=${customerId}`);

  salesByAttender = (from: string, to: string, attenderId = 0) => {
    const params = new URLSearchParams({ from, to });
    if (attenderId) params.set('attenderId', String(attenderId));
    return this.http.get(`/v1/account-reports/sales-by-attender?${params}`);
  };

  dayAccount = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/day-account?from=${from}&to=${to}`);

  dayBook = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/day-book?from=${from}&to=${to}`);

  openingBalances = () => this.http.get('/v1/account-reports/day-book/opening-balances');
  saveOpeningBalance = (payload: any) => this.http.post('/v1/account-reports/day-book/opening-balance', payload);

  commission = (from: string, to: string, customerId: number) =>
    this.http.get(`/v1/account-reports/commission?from=${from}&to=${to}&customerId=${customerId}`);
  commissionCustomers = () => this.http.get('/v1/account-reports/commission-customers');

  gstSalesSummary = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/gst/sales-summary?from=${from}&to=${to}`);
  gstBillWise = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/gst/bill-wise?from=${from}&to=${to}`);
  gstItemWise = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/gst/item-wise?from=${from}&to=${to}`);
  gstHsn = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/gst/hsn?from=${from}&to=${to}`);
  gstPurchase = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/gst/purchase?from=${from}&to=${to}`);
  gstPurchaseSummary = (from: string, to: string) =>
    this.http.get(`/v1/account-reports/gst/purchase-summary?from=${from}&to=${to}`);
}

export const accountApi = new AccountReportApiService();

export const accountData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const accountError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
