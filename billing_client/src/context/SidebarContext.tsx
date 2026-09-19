import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface SidebarContextType {
  mobileOpen: boolean;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  collapsed: boolean;
  toggleSidebar: () => void;
  collapseSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const toggleMobileSidebar = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const collapseSidebar = useCallback(() => {
    setCollapsed(true);
  }, []);

  const value = useMemo(
    () => ({
      mobileOpen,
      toggleMobileSidebar,
      closeMobileSidebar,
      collapsed,
      toggleSidebar,
      collapseSidebar,
    }),
    [mobileOpen, collapsed, toggleMobileSidebar, closeMobileSidebar, toggleSidebar, collapseSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};
