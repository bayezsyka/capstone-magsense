import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import useNetworkStatus from '../hooks/useNetworkStatus';
import { AlertTriangle } from 'lucide-react';

const AppLayout = () => {
  const isOnline = useNetworkStatus();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans overflow-hidden">
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden relative w-full">
        {/* OFFLINE BANNER */}
        <div className={`transition-all duration-500 overflow-hidden bg-amber-500 text-white font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-inner z-50 ${isOnline ? 'h-0 py-0 opacity-0' : 'h-10 py-2 opacity-100'}`}>
          <AlertTriangle size={16} />
          <span>Anda sedang offline. Menampilkan data terakhir yang tersimpan.</span>
        </div>

        <TopNav onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 relative z-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
