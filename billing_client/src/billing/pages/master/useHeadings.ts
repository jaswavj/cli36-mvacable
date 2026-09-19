import { useEffect, useState } from 'react';
import { masterApi, masterData } from '../../../api/master/master-api-service';

export type Headings = { head1: string; head2: string; head3: string };

export const useHeadings = () => {
  const [heads, setHeads] = useState<Headings>({ head1: 'Category', head2: 'Brand', head3: 'Product' });

  useEffect(() => {
    masterApi
      .lookups()
      .then((res) => {
        const data = masterData<any>(res);
        if (data?.headings) setHeads(data.headings);
      })
      .catch(() => undefined);
  }, []);

  return heads;
};
