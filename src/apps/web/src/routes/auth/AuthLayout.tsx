import { PropsWithChildren } from 'react';

export function AuthLayout({ children }: PropsWithChildren) {
  return <div className="font-sans">{children}</div>;
}
