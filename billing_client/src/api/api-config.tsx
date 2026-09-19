import axios, { AxiosInstance } from 'axios';
import billingConfig, { appHref } from '../billingConfig';
import { StorageService } from './storage/storageService';
import { store } from '../state/store';
import { authLogout } from '../login/components/state/loginSlice';

let isHandlingUnauthorized = false;

class ApiConfig {

    private apiBaseUrl: string;
    private storageService: StorageService = new StorageService();
    private axiosInstance: AxiosInstance;

    constructor() {
        this.apiBaseUrl = billingConfig.apiBaseName + '/api/';
        this.axiosInstance = axios.create({ baseURL: this.apiBaseUrl });
        this.attachInterceptors();
    }

    private attachInterceptors = () => {
        this.axiosInstance.interceptors.request.use(
            (config) => {
                const token = this.storageService.getToken();
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        this.axiosInstance.interceptors.response.use(
            (response) => {
                const authHeader = response.headers['authorization'] || response.headers['Authorization'];
                if (authHeader?.startsWith('Bearer ')) {
                    this.storageService.setToken(authHeader.substring(7));
                }
                return response;
            },
            (error) => {
                const status = error.response?.status;
                const url = String(error.config?.url || '');
                const isLoginCall = url.includes('/v1/login');
                const path = window.location.pathname.replace(/\/$/, '') || '/';
                const onLoginPage = path.endsWith('/login');
                if (status === 401 && !isLoginCall && !onLoginPage) {
                    if (!isHandlingUnauthorized) {
                        isHandlingUnauthorized = true;
                        store.dispatch(authLogout());
                        window.location.href = appHref('/login');
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    public getAxiosInstance = () => {
        return this.axiosInstance;
    }
}

export default ApiConfig;
