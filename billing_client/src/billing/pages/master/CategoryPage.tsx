import React from 'react';
import { CategoryPage as NamedCategory } from './NamedMasterPage';
import { useHeadings } from './useHeadings';

const CategoryPage: React.FC = () => {
  const heads = useHeadings();
  return <NamedCategory label={heads.head1 || 'Category'} />;
};

export default CategoryPage;
