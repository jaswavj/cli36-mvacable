import HttpClientWrapper from '../http-client-wrapper';

export type CustomerType = 'cable' | 'wifi';

export type CableCustomer = {
  id: number;
  customerType: CustomerType | string;
  customerId: string;
  name: string;
  mobile: string;
  address: string;
  area: string;
  joiningDate: string;
  joiningDateIso: string;
  disconnectDate?: string;
  disconnectDateIso?: string;
  disconnectNotes?: string;
  reconnectDate?: string;
  reconnectDateIso?: string;
  reconnectNotes?: string;
  notes: string;
  monthlyAmount?: number;
  isActive?: number;
  uid?: number;
  createdBy?: string;
  shopId?: string;
};

export type PagedCustomers = {
  rows?: CableCustomer[];
  total?: number;
  page?: number;
  size?: number;
};

export type CableCustomerSavePayload = {
  id?: number;
  customerType: CustomerType;
  customerId: string;
  name: string;
  mobile: string;
  address: string;
  area: string;
  joiningDate: string;
  notes: string;
  monthlyAmount: number;
};

export class CustomerApiService {
  private http = new HttpClientWrapper();

  list = (query: {
    type?: CustomerType | '';
    activeOnly?: boolean;
    search?: string;
    page?: number;
    size?: number;
  } = {}) => {
    const params = new URLSearchParams();
    if (query.type) params.set('type', query.type);
    if (query.activeOnly) params.set('activeOnly', 'true');
    if (query.search?.trim()) params.set('search', query.search.trim());
    params.set('page', String(query.page || 1));
    params.set('size', String(query.size || 25));
    return this.http.get(`/v1/cable-customers?${params}`);
  };

  save = (payload: CableCustomerSavePayload) => this.http.post('/v1/cable-customers', payload);

  connections = (
    from: string,
    to: string,
    query: { type?: CustomerType | ''; search?: string; page?: number; size?: number } = {}
  ) => {
    const params = new URLSearchParams({ from, to });
    if (query.type) params.set('type', query.type);
    if (query.search?.trim()) params.set('search', query.search.trim());
    params.set('page', String(query.page || 1));
    params.set('size', String(query.size || 25));
    return this.http.get(`/v1/cable-customers/connections?${params}`);
  };

  disconnections = (
    from: string,
    to: string,
    query: { type?: CustomerType | ''; search?: string; page?: number; size?: number } = {}
  ) => {
    const params = new URLSearchParams({ from, to });
    if (query.type) params.set('type', query.type);
    if (query.search?.trim()) params.set('search', query.search.trim());
    params.set('page', String(query.page || 1));
    params.set('size', String(query.size || 25));
    return this.http.get(`/v1/cable-customers/disconnections?${params}`);
  };

  disconnect = (id: number, payload: { disconnectDate: string; notes: string }) =>
    this.http.post(`/v1/cable-customers/${id}/disconnect`, payload);

  reconnect = (id: number, payload: { reconnectDate: string; notes: string }) =>
    this.http.post(`/v1/cable-customers/${id}/reconnect`, payload);

  setActive = (id: number, active: boolean) =>
    this.http.post(`/v1/cable-customers/${id}/active?active=${active}`, {});
}

export const customerApi = new CustomerApiService();

export const customerData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const customerError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
