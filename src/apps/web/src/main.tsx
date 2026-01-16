import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import './shared/styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary title="PyToYa is unavailable">
      <RouterProvider router={router} />
    </ErrorBoundary>
  </React.StrictMode>,
);
