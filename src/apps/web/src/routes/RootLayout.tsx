import { ReactNode, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Providers } from '../app/providers';
import '../shared/styles/globals.css';

type RootLayoutProps = {
  children?: ReactNode;
};

export function RootLayout({ children }: RootLayoutProps) {
  const location = useLocation();

  useEffect(() => {
    document.title = 'PyToYa';
  }, []);

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.focus();
    }
  }, [location.pathname, location.search]);

  return (
    <Providers>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow"
      >
        Skip to content
      </a>
      {children ?? <Outlet />}
    </Providers>
  );
}




