const SESSION_KEYS = ['token', 'expireTime', 'shopId', 'isAdmin'] as const;

const adminFlag = (value: unknown) => (value === 1 || value === '1' || value === true ? '1' : '0');

export const persistLoginSession = (data: { shopId?: string | null; isAdmin?: number | boolean | string | null }) => {
  if (data.shopId != null && String(data.shopId).trim() !== '') {
    sessionStorage.setItem('shopId', String(data.shopId).trim());
  }
  sessionStorage.setItem('isAdmin', adminFlag(data.isAdmin));
};

export const sessionShopId = () => sessionStorage.getItem('shopId') || '';

export const sessionIsAdmin = () => sessionStorage.getItem('isAdmin') === '1';

export const clearSessionLogoutArtifacts = (): void => {
  SESSION_KEYS.forEach((key) => {
    sessionStorage.removeItem(key);
  });
  localStorage.removeItem('expireTime');
};
