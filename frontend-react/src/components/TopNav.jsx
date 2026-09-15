import React from 'react';
import { Bell, ChevronRight } from 'lucide-react';

const TopNav = () => {
  return (
    <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center text-gray-500 text-sm">
        <span className="text-gray-400"><ChevronRight size={16} /></span>
        <span className="font-semibold text-gray-800 ml-2">Dashboard</span>
      </div>
      
      <div className="flex items-center space-x-6">
        <button className="relative text-gray-400 hover:text-gray-600 transition-colors">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Koordinator</p>
            <p className="text-sm font-semibold text-gray-800">Pembudidaya</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-green-100 border-2 border-white shadow-sm flex items-center justify-center">
            <span className="text-mag-green font-bold text-sm">PB</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopNav;
