import React from 'react';

export type PermItem = { id: number; name: string };

export const permIcon = (name: string) => {
  const n = (name || '').toLowerCase();
  if (n.includes('dashboard')) return 'fas fa-tachometer-alt';
  if (n.includes('collection')) return 'fas fa-hand-holding-usd';
  if (n.includes('customer') && n.includes('list')) return 'fas fa-users';
  if (n.includes('customer')) return 'fas fa-user-plus';
  if (n.includes('cable') || n.includes('wifi')) return 'fas fa-wifi';
  if (n.includes('salon') || (n.includes('bill') && !n.includes('stock'))) return 'fas fa-file-invoice';
  if (n.includes('bill') && n.includes('stock')) return 'fas fa-box-open';
  if (n.includes('bill')) return 'fas fa-file-invoice';
  if (n.includes('master')) return 'fas fa-box';
  if (n.includes('stock')) return 'fas fa-boxes';
  if (n.includes('user')) return 'fas fa-user-shield';
  if (n.includes('invent')) return 'fas fa-warehouse';
  if (n.includes('account')) return 'fas fa-file-alt';
  if (n.includes('admin')) return 'fas fa-cog';
  if (n.includes('stat')) return 'fas fa-chart-pie';
  if (n.includes('credit')) return 'fas fa-money-check-alt';
  if (n.includes('order')) return 'fas fa-list-alt';
  if (n.includes('expense')) return 'fas fa-money-bill-wave';
  if (n.includes('discount')) return 'fas fa-percent';
  if (n.includes('print')) return 'fas fa-print';
  if (n.includes('cancel')) return 'fas fa-ban';
  if (n.includes('edit') || n.includes('date')) return 'fas fa-pen';
  if (n.includes('exchange') || n.includes('return')) return 'fas fa-sync';
  return 'fas fa-shield-alt';
};

type Props = {
  items: PermItem[];
  selected: number[];
  onToggle: (id: number) => void;
  emptyText?: string;
};

const PermissionTiles: React.FC<Props> = ({ items, selected, onToggle, emptyText }) => {
  if (items.length === 0) {
    return <div className="mst-note">{emptyText || 'No items found.'}</div>;
  }
  return (
    <div className="usr-tiles">
      {items.map((item) => {
        const on = selected.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            className={`usr-tile${on ? ' on' : ''}`}
            onClick={() => onToggle(item.id)}
            aria-pressed={on}
          >
            <span className="usr-tile-ico"><i className={permIcon(item.name)} /></span>
            <span className="usr-tile-name">{item.name}</span>
            <i className={`usr-tile-mark fas ${on ? 'fa-check-circle' : 'fa-circle'}`} />
          </button>
        );
      })}
    </div>
  );
};

export const PermissionBar: React.FC<{
  selected: number;
  total: number;
  onSelectAll: () => void;
  onClear: () => void;
  disabled?: boolean;
}> = ({ selected, total, onSelectAll, onClear, disabled }) => (
  <div className="usr-tile-bar">
    <span className="usr-count">{selected} of {total} selected</span>
    <div className="usr-tile-acts">
      <button className="mst-btn mst-btn-outline" type="button" disabled={disabled || total === 0} onClick={onSelectAll}>Select all</button>
      <button className="mst-btn mst-btn-outline" type="button" disabled={disabled || selected === 0} onClick={onClear}>Clear</button>
    </div>
  </div>
);

export default PermissionTiles;
