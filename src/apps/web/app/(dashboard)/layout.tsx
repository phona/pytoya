import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <a href="/" className="text-xl font-bold text-gray-900">
                  PyToYa
                </a>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a
                  href="/projects"
                  className="inline-flex items-center px-1 pt-1 border-b-2 border-indigo-500 text-sm font-medium text-gray-900"
                >
                  Projects
                </a>
              </div>
            </div>
            <div className="flex items-center">
              <a
                href="/login"
                className="text-sm text-gray-700 hover:text-gray-900"
              >
                Sign out
              </a>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
