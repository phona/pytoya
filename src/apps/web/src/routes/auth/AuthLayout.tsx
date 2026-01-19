import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <main id="main-content" tabIndex={-1} className="font-sans focus:outline-none">
      <Outlet />
    </main>
  );
}




