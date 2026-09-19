const isDev: boolean = import.meta.env.DEV;

// Empty at domain root. Do not use '/' — '/' + '/login' becomes '//login' (https://login/).
let routerBaseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');

const appHref = (path: string) => {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${routerBaseUrl}${p}`;
};

const envApi = import.meta.env.VITE_API_BASE_URL;
const apiBaseName =
  envApi && envApi !== 'auto'
    ? envApi.replace(/\/$/, '')
    : typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:9098`
      : 'http://localhost:9098';

const billingConfig = {
  apiBaseName,
  appName: import.meta.env.VITE_APP_NAME || '',
};

export { routerBaseUrl, appHref, isDev };

export default billingConfig;
