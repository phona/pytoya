import { ReactNode } from 'react';
import { I18nProvider } from '@/shared/providers/I18nProvider';

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return <I18nProvider>{children}</I18nProvider>;
}




