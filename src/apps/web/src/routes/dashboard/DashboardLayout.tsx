import { ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

export function DashboardLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header>
        <nav className="bg-white border-b border-gray-200" aria-label="Primary">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/" className="text-xl font-bold text-gray-900">
                    PyToYa
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <NavLink
                    to="/projects"
                    className={({ isActive }) =>
                      `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`
                    }
                  >
                    Projects
                  </NavLink>
                  <NavLink
                    to="/models"
                    className={({ isActive }) =>
                      `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`
                    }
                  >
                    Models
                  </NavLink>
                  <NavLink
                    to="/prompts"
                    className={({ isActive }) =>
                      `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`
                    }
                  >
                    Prompts
                  </NavLink>
                </div>
              </div>
              <div className="flex items-center">
                <Link
                  to="/login"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Sign out
                </Link>
              </div>
            </div>
          </div>
        </nav>
      </header>
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
