import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex bg-gray-50 min-h-screen relative overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 w-full lg:ml-0 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
