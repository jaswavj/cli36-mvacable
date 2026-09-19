import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditAccount, CreditIndex } from './CreditShared';

const CustomerBalancePage: React.FC = () => {
  const [params] = useSearchParams();
  const id = Number(params.get('id') || 0);
  if (id > 0) {
    return <CreditAccount kind="customer" id={id} />;
  }
  return <CreditIndex kind="customer" />;
};

export default CustomerBalancePage;
