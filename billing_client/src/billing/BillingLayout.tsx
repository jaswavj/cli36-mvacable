import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModulePageOutlet from '../components/ModulePageOutlet';
import { useSelector } from 'react-redux';
import { RootState } from '../state/store';
import Sidebar from './components/Sidebar';

const BillingLayout: React.FC = () => {
  const navigate = useNavigate();
  const loginData = useSelector((state: RootState) => state.loginData);

  useEffect(() => {
    if (!loginData.authorized) {
      navigate('/login');
    }
  }, [loginData, navigate]);

  return (
    <div className="cash-counter-layout" style={{
      width: '100%',
      overflow: 'hidden',
    }}>
      <Sidebar />
      <div className="module-content" style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <ModulePageOutlet />
      </div>
    </div>
  );
};

export default BillingLayout;
