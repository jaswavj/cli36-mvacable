import React, { useState } from 'react';
import MenuItem from './MenuItem';
import { useSidebar } from '../../context/SidebarContext';
import { useSelector } from 'react-redux';
import { RootState } from '../../state/store';
import { billingMenuConfig, filterMenuByModules } from '../config/menu.config';
import '../../style/sidebar.css';
import ModuleSidebarShell from '../../components/ModuleSidebarShell';
import { toggleExpandedMenus } from '../../components/sidebarExpanded';
import { useCompanyName } from '../../context/CompanyNameContext';

const Sidebar: React.FC = () => {
  const { mobileOpen, closeMobileSidebar, collapsed } = useSidebar();
  const moduleIds = useSelector((s: RootState) => s.loginData.moduleIds || []);
  const { companyName } = useCompanyName();
  const menus = filterMenuByModules(billingMenuConfig, moduleIds);
  const [expandedMenuId, setExpandedMenuIds] = useState<string[]>([]);
  const setExpandedMenuId = (id: string | null) => {
    if (!id) return;
    setExpandedMenuIds((prev) => toggleExpandedMenus(prev, id));
  };

  return (
    <ModuleSidebarShell
      title={companyName || 'Company'}
      collapsed={collapsed}
      mobileOpen={mobileOpen}
      onCloseMobile={closeMobileSidebar}
    >
      <ul className="sidebar-menu">
        {menus.map((menu) => (
          <MenuItem
            key={menu.id}
            item={menu}
            collapsed={collapsed}
            onNavigate={closeMobileSidebar}
            expandedMenuId={expandedMenuId}
            setExpandedMenuId={setExpandedMenuId}
          />
        ))}
      </ul>
    </ModuleSidebarShell>
  );
};

export default Sidebar;
