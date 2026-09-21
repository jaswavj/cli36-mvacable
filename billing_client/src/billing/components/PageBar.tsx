import React from 'react';

export const PAGE_SIZE = 25;

export type Paged<T> = {
  rows?: T[];
  total?: number;
  page?: number;
  size?: number;
};

type Props = {
  page: number;
  size?: number;
  total: number;
  onPage: (page: number) => void;
};

const PageBar: React.FC<Props> = ({ page, size = PAGE_SIZE, total, onPage }) => {
  const count = Number(total || 0);
  if (count <= 0) return null;
  const pages = Math.max(1, Math.ceil(count / size));
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, count);
  return (
    <div className="mst-pagebar">
      <span>
        {from}–{to} of {count.toLocaleString('en-IN')}
      </span>
      <div className="mst-pagebar-acts">
        <button type="button" className="mst-btn mst-btn-outline" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </button>
        <em>
          {page} / {pages}
        </em>
        <button type="button" className="mst-btn mst-btn-outline" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
};

export default PageBar;
