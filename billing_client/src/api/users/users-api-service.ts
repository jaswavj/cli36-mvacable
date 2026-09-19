import HttpClientWrapper from '../http-client-wrapper';

export class UsersApiService {
  private http = new HttpClientWrapper();

  modules = () => this.http.get('/v1/users/modules');
  list = (shopId?: string, blocked?: boolean) => {
    const params = new URLSearchParams();
    if (shopId) params.set('shopId', shopId);
    if (blocked) params.set('blocked', 'true');
    const q = params.toString();
    return this.http.get(`/v1/users/list${q ? `?${q}` : ''}`);
  };

  blockUser = (id: number) => this.http.post(`/v1/users/${id}/block`, {});
  unblockUser = (id: number) => this.http.post(`/v1/users/${id}/unblock`, {});
  outlets = () => this.http.get('/v1/users/outlets');
  create = (payload: any) => this.http.post('/v1/users', payload);

  permissions = (id: number) => this.http.get(`/v1/users/${id}/permissions`);
  savePermissions = (id: number, ids: number[]) => this.http.post(`/v1/users/${id}/permissions`, { ids });

  specialPermissions = (id: number) => this.http.get(`/v1/users/${id}/special-permissions`);
  saveSpecialPermissions = (id: number, ids: number[]) =>
    this.http.post(`/v1/users/${id}/special-permissions`, { ids });

  attenders = () => this.http.get('/v1/users/attenders');
  saveAttender = (payload: any) => this.http.post('/v1/users/attenders', payload);
  blockAttender = (id: number) => this.http.post(`/v1/users/attenders/${id}/block`, {});
  unblockAttender = (id: number) => this.http.post(`/v1/users/attenders/${id}/unblock`, {});

  changePassword = (payload: any) => this.http.post('/v1/users/change-password', payload);

  discounts = () => this.http.get('/v1/users/discounts');
  saveDiscount = (id: number, discPer: number) => this.http.post(`/v1/users/${id}/discount`, { discPer });
}

export const usersApi = new UsersApiService();

export const usersData = <T>(res: any): T => {
  if (!res?.success) throw new Error(res?.data?.error || 'Request failed');
  return res.data as T;
};

export const usersError = (err: any, fallback: string) =>
  err?.response?.data?.data?.error || err?.message || fallback;
