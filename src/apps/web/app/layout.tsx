import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata = {
  title: 'PyToYa',
  description: 'PyToYa web application'
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
