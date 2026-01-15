import { ReactNode, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Providers } from '../app/providers';
import '../shared/styles/globals.css';

type RootLayoutProps = {
  children?: ReactNode;
};

export function RootLayout({ children }: RootLayoutProps) {
  useEffect(() => {
    document.title = 'PyToYa';
  }, []);

  return <Providers>{children ?? <Outlet />}</Providers>;
}
