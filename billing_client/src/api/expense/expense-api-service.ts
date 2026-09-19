import HttpClientWrapper from '../http-client-wrapper';

export class ExpenseApiService {
  private http = new HttpClientWrapper();

  types = () => this.http.get('/v1/expense/types');
  saveType = (payload: { id?: number; name: string }) => this.http.post('/v1/expense/types', payload);
  blockType = (id: number) => this.http.post(`/v1/expense/types/${id}/block`, {});
  saveEntry = (payload: any) => this.http.post('/v1/expense/entries', payload);
  report = (from: string, to: string, typeId?: number) => {
    const params = new URLSearchParams({ from, to });
    if (typeId) params.set('typeId', String(typeId));
    return this.http.get(`/v1/expense/report?${params}`);
  };
}

export const expenseApi = new ExpenseApiService();

export const expenseData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const expenseError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
