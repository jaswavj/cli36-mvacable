import HttpClientWrapper from '../http-client-wrapper';

export class OrderListApiService {
  private http = new HttpClientWrapper();

  list = (type = 'pending') => this.http.get(`/v1/orders?type=${encodeURIComponent(type)}`);
  detail = (id: number) => this.http.get(`/v1/orders/${id}`);
  markOrderDelivered = (id: number) => this.http.post(`/v1/orders/${id}/deliver`, {});
  markItemDelivered = (detailId: number) => this.http.post(`/v1/orders/items/${detailId}/deliver`, {});
}

export const orderApi = new OrderListApiService();

export const orderData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const orderError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
