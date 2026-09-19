import React, { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { RootState } from '../state/store';
import { LoginApiService } from '../api/login/login-api-service';
import { StorageService } from '../api/storage/storageService';
import { saveLoginDataAction, authLogout } from '../login/components/state/loginSlice';

const AuthGuard = ({ component }: any) => {
    const loginData = useSelector((s: RootState) => s.loginData);
    const loginApiService: LoginApiService = new LoginApiService();
    const storageService: StorageService = new StorageService();
    const [isRestoring, setIsRestoring] = useState(true);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        let isMounted = true;

        const restoreSession = async () => {
            const token = storageService.getToken();
            if (!token) {
                setIsRestoring(false);
                navigate('/login', { replace: true });
                return;
            }

            if (loginData?.authorized) {
                setIsRestoring(false);
                return;
            }

            try {
                const response = await loginApiService.getMe();
                if (!response?.success || !response?.data) {
                    throw new Error('Unable to restore user session');
                }
                dispatch(saveLoginDataAction(response.data));
                storageService.setToken(response.data.accessToken);
            } catch {
                dispatch(authLogout());
                navigate('/login', { replace: true });
            } finally {
                if (isMounted) {
                    setIsRestoring(false);
                }
            }
        };

        restoreSession();
        return () => {
            isMounted = false;
        };
    }, [navigate]);

    if (isRestoring) {
        return null;
    }

    if (!loginData?.authorized) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Fragment>
            {component}
        </Fragment>
    );
};

export default AuthGuard;
