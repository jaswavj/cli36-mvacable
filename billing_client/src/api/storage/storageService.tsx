export class StorageService {
    TOKENKEY = 'token';
    SHOP_ID_KEY = 'shopId';
    IS_ADMIN_KEY = 'isAdmin';

    public setToken(token: string) {
        if (!token) {
            return;
        }
        window.sessionStorage.setItem(this.TOKENKEY, token);
    }

    public getToken() {
        return window.sessionStorage.getItem(this.TOKENKEY);
    }

    public getShopId() {
        return window.sessionStorage.getItem(this.SHOP_ID_KEY) || '';
    }

    public isAdmin() {
        return window.sessionStorage.getItem(this.IS_ADMIN_KEY) === '1';
    }

    public clearToken = () => {
        window.sessionStorage.removeItem(this.TOKENKEY);
        window.sessionStorage.removeItem(this.SHOP_ID_KEY);
        window.sessionStorage.removeItem(this.IS_ADMIN_KEY);
    }
}
