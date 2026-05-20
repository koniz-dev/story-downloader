import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { I18nProvider } from './lib/i18n';
import { ThemeProvider } from './lib/theme';
import { ToastProvider } from './lib/toast';
import { reportWebVitals } from './lib/vitals';
import './index.css';

// ErrorBoundary lives INSIDE the providers so the localized fallback can read
// the user's chosen language via useI18n.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

reportWebVitals();
