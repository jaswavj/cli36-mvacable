import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

const ModulePageOutlet = () => (
  <Suspense fallback={<div className="module-content-loading">Loading…</div>}>
    <Outlet />
  </Suspense>
);

export default ModulePageOutlet;
