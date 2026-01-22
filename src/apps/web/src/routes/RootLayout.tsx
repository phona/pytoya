import { ReactNode, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '@/shared/providers/I18nProvider';

type RootLayoutProps = {
  children?: ReactNode;
};

export function RootLayout({ children }: RootLayoutProps) {
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    document.title = t('app.name');
  }, [t]);

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.focus();
    }
  }, [location.pathname, location.search]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:shadow"
      >
        {t('a11y.skipToContent')}
      </a>
      {children ?? <Outlet />}
    </>
  );
}




