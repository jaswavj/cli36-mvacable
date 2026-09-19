import 'bootstrap/dist/css/bootstrap.min.css';
import '@fontsource/plus-jakarta-sans/400.css';
import '@fontsource/plus-jakarta-sans/500.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import './style/theme.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import { store, persistor } from './state/store';
import 'react-toastify/dist/ReactToastify.css';
import { PersistGate } from 'redux-persist/integration/react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ThemeRoot, { syncDocumentTheme } from './theme/ThemeRoot';

syncDocumentTheme();

document.addEventListener(
  'wheel',
  (event) => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement
      && target.type === 'number'
      && document.activeElement === target
    ) {
      event.preventDefault();
      target.blur();
    }
  },
  { passive: false }
);

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ThemeRoot>
        <App />
      </ThemeRoot>
    </PersistGate>
  </Provider>
);
