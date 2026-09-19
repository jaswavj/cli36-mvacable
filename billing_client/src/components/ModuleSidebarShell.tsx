import React from 'react';
import { version as appVersion } from '../../package.json';

interface ModuleSidebarShellProps {
  title: React.ReactNode;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  children: React.ReactNode;
  className?: string;
}

const ModuleSidebarShell: React.FC<ModuleSidebarShellProps> = ({
  title,
  collapsed,
  mobileOpen,
  onCloseMobile,
  children,
  className = '',
}) => {
  return (
    <>
      <div
        className={`mobile-overlay ${mobileOpen ? 'show' : ''}`}
        onClick={onCloseMobile}
      />

      <div
        className={`module-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''} ${className}`.trim()}
      >
        <div className="module-sidebar-inner">
          <div className="module-sidebar-content">
            <div className="sidebar-header">
              <h2 className="sidebar-header-title">{title}</h2>
            </div>
            <div className="sidebar-nav">
              {children}
            </div>
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-version" title={`Version ${appVersion}`}>
              v{appVersion}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModuleSidebarShell;
