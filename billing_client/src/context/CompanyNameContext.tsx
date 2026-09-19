import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminApi, adminData } from '../api/admin/admin-api-service';

const STORAGE_KEY = 'mva-company-name';

type CompanyNameContextValue = {
  companyName: string;
  setCompanyName: (name: string) => void;
};

const CompanyNameContext = createContext<CompanyNameContextValue>({
  companyName: '',
  setCompanyName: () => undefined,
});

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
};

export const CompanyNameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companyName, setName] = useState(readStored);

  const setCompanyName = useCallback((name: string) => {
    const next = (name || '').trim();
    setName(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
    document.title = next || 'Billing';
  }, []);

  useEffect(() => {
    if (companyName) document.title = companyName;
    adminApi
      .company()
      .then((res) => {
        const data = adminData<{ shopName?: string }>(res);
        if (data?.shopName?.trim()) setCompanyName(data.shopName);
      })
      .catch(() => undefined);
  }, [setCompanyName]);

  return (
    <CompanyNameContext.Provider value={{ companyName, setCompanyName }}>
      {children}
    </CompanyNameContext.Provider>
  );
};

export const useCompanyName = () => useContext(CompanyNameContext);
