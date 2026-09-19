import HttpClientWrapper from '../http-client-wrapper';

export class MasterApiService {
  private http = new HttpClientWrapper();

  lookups = () => this.http.get('/v1/master/lookups');

  categories = () => this.http.get('/v1/master/categories');
  saveCategory = (payload: any) => this.http.post('/v1/master/categories', payload);
  blockCategory = (id: number) => this.http.post(`/v1/master/categories/${id}/block`, {});

  brands = () => this.http.get('/v1/master/brands');
  saveBrand = (payload: any) => this.http.post('/v1/master/brands', payload);
  blockBrand = (id: number) => this.http.post(`/v1/master/brands/${id}/block`, {});

  units = () => this.http.get('/v1/master/units');
  saveUnit = (payload: any) => this.http.post('/v1/master/units', payload);
  unitStatus = (id: number, active: number) => this.http.post(`/v1/master/units/${id}/status?active=${active}`, {});

  customers = () => this.http.get('/v1/master/customers');
  saveCustomer = (payload: any) => this.http.post('/v1/master/customers', payload);
  blockCustomer = (id: number) => this.http.post(`/v1/master/customers/${id}/block`, {});

  products = () => this.http.get('/v1/master/products');
  saveProduct = (payload: any) => this.http.post('/v1/master/products', payload);
  blockProduct = (id: number) => this.http.post(`/v1/master/products/${id}/block`, {});

  stockProducts = () => this.http.get('/v1/master/stock/products');
  adjustStock = (payload: any) => this.http.post('/v1/master/stock/adjust', payload);

  components = (productId: number) => this.http.get(`/v1/master/components?productId=${productId}`);
  saveComponent = (payload: any) => this.http.post('/v1/master/components', payload);
  deleteComponent = (id: number) => this.http.delete(`/v1/master/components/${id}`);

  tables = () => this.http.get('/v1/master/tables');
  saveTable = (payload: any) => this.http.post('/v1/master/tables', payload);
  deleteTable = (id: number) => this.http.delete(`/v1/master/tables/${id}`);

  bulkProducts = (name?: string, categoryId?: number) => {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (categoryId) params.set('categoryId', String(categoryId));
    return this.http.get(`/v1/master/bulk-products?${params.toString()}`);
  };
  bulkUpdate = (payload: any) => this.http.post('/v1/master/bulk-products', payload);

  barcodes = () => this.http.get('/v1/master/barcodes');
}

export const masterApi = new MasterApiService();

export const masterData = <T>(res: any): T => {
  if (!res?.success) {
    throw new Error(res?.data?.error || 'Request failed');
  }
  return res.data as T;
};

export const masterError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
