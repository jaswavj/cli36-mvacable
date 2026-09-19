import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditAccount, CreditIndex } from './CreditShared';

const SupplierPaymentPage: React.FC = () => {
  const [params] = useSearchParams();
  const id = Number(params.get('id') || 0);
  if (id > 0) {
    return <CreditAccount kind="supplier" id={id} />;
  }
  return <CreditIndex kind="supplier" />;
};

export default SupplierPaymentPage;
