import React from 'react';
import { BrandsPage as NamedBrands } from './NamedMasterPage';
import { useHeadings } from './useHeadings';

const BrandsPage: React.FC = () => {
  const heads = useHeadings();
  return <NamedBrands label={heads.head2 || 'Brands'} />;
};

export default BrandsPage;
