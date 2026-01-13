import type { ReactNode } from 'react';

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
      <body>{children}</body>
    </html>
  );
}
