import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { ApiError } from './api/client';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Only retry for network errors (not 5xx — those will keep failing)
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 500) return false;
        return failureCount < 1;
      },
      // Stop polling once a query enters error state
      refetchIntervalInBackground: false,
      staleTime: 10_000,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: 'var(--status-success)', secondary: 'var(--bg-base)' },
            },
            error: {
              iconTheme: { primary: 'var(--status-error)', secondary: 'var(--bg-base)' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
