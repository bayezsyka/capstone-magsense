import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';

const AppLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50/50 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
