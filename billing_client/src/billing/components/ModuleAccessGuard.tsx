import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { RootState } from '../../state/store';
import { defaultAppPath, moduleIdForPath } from '../config/menu.config';

export const DefaultAppRedirect: React.FC = () => {
  const moduleIds = useSelector((s: RootState) => s.loginData.moduleIds || []);
  return <Navigate to={defaultAppPath(moduleIds)} replace />;
};

const ModuleAccessGuard: React.FC = () => {
  const location = useLocation();
  const moduleIds = useSelector((s: RootState) => s.loginData.moduleIds || []);
  const needed = moduleIdForPath(location.pathname);
  if (needed != null && !moduleIds.map(Number).includes(needed)) {
    return <Navigate to={defaultAppPath(moduleIds)} replace />;
  }
  return <Outlet />;
};

export default ModuleAccessGuard;
