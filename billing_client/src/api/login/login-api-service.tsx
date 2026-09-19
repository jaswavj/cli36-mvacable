import HttpClientWrapper from '../http-client-wrapper';

export class LoginApiService {

    private httpWrapper: HttpClientWrapper;

    constructor() {
        this.httpWrapper = new HttpClientWrapper();
    }

    public loginUser = async (payload: any) => {
        return await this.httpWrapper.post('/v1/login', payload);
    }

    public getMe = async () => {
        return await this.httpWrapper.get('/v1/getLoginUser');
    }
}
