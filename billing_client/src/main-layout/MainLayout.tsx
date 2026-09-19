import Header from './header/Header'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Fragment, Suspense } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../state/store'

const MainLayout = () => {
    const location = useLocation()
    const loginUser = useSelector((s: RootState) => s.loginData)

    return (
        <Fragment>
            {loginUser?.authorized ? (
                <div className="main-layout" style={{
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    <Header />
                    <div style={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'auto',
                        display: 'flex',
                    }}>
                        <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading…</div>}>
                            <Outlet />
                        </Suspense>
                    </div>
                </div>
            ) : (
                <Navigate to="/" state={{ from: location }} replace />
            )}
        </Fragment>
    )
}

export default MainLayout
