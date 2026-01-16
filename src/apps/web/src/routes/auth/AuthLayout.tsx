import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="font-sans">
      <Outlet />
    </div>
  );
}
