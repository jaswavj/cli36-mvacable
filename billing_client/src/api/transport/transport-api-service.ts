import HttpClientWrapper from '../http-client-wrapper';

export class TransportApiService {
  private http = new HttpClientWrapper();

  searchTransports = (query?: string, phone?: string) => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (phone) params.set('phone', phone);
    return this.http.get(`/v1/transport/customers?${params.toString()}`);
  };

  bills = () => this.http.get('/v1/transport/bills');
  pendingAllotments = () => this.http.get('/v1/transport/pending-allotments');
  allotted = () => this.http.get('/v1/transport/allotted');
  dashboard = (year?: number, month?: number) => {
    const params = new URLSearchParams();
    if (year) params.set('year', String(year));
    if (month) params.set('month', String(month));
    return this.http.get(`/v1/transport/dashboard?${params.toString()}`);
  };
  pendingPayments = () => this.http.get('/v1/transport/pending-payments');
  pendingVehiclePayments = () => this.http.get('/v1/transport/pending-vehicle-payments');
  payments = (id: number, kind: 'agent' | 'vehicle') =>
    this.http.get(`/v1/transport/${id}/payments?kind=${kind}`);
  saveBill = (payload: any) => this.http.post('/v1/transport/save', payload);
  allot = (id: number, payload: any) => this.http.post(`/v1/transport/${id}/allot`, payload);
  collect = (id: number, payload: any) => this.http.post(`/v1/transport/${id}/collect`, payload);
  payVehicle = (id: number, payload: any) => this.http.post(`/v1/transport/${id}/pay-vehicle`, payload);
  markUnloaded = (id: number, unloaded: boolean) => this.http.post(`/v1/transport/${id}/unload`, { unloaded });
  uploadBillImage = (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return this.http.postForm(`/v1/transport/${id}/bill-image`, form);
  };
}

export const transportApi = new TransportApiService();

export const transportData = <T>(res: any): T => {
  if (!res?.success) {
    throw new Error(res?.data?.error || 'Request failed');
  }
  return res.data as T;
};

export const transportError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
