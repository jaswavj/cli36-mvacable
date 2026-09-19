import { AxiosInstance } from 'axios';
import ApiConfig from './api-config';

class HttpClientWrapper {

    private axiosClient: AxiosInstance;

    constructor() {
        this.axiosClient = new ApiConfig().getAxiosInstance();
    }

    public post = async (path: string, payload: any) => {
        const response: any = await this.axiosClient.post(path, payload, this.getJsonHeaderConfig());
        return response.data;
    }

    public postForm = async (path: string, payload: FormData) => {
        const response: any = await this.axiosClient.post(path, payload);
        return response.data;
    }

    public get = async (path: string) => {
        const response: any = await this.axiosClient.get(path, this.getJsonHeaderConfig());
        return response.data;
    }

    public delete = async (path: string) => {
        const response: any = await this.axiosClient.delete(path, this.getJsonHeaderConfig());
        return response.data;
    }

    getJsonHeaderConfig = () => {
        return { headers: { 'Content-Type': 'application/json' } };
    }
}

export default HttpClientWrapper;
