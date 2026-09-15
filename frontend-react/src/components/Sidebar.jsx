import React from 'react';
import { LayoutDashboard, Thermometer, Sprout, History, Settings, LogOut, Activity } from 'lucide-react';
import { useNavigate, NavLink } from 'react-router-dom';

const Sidebar = () => {
  const navigate = useNavigate();

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Thermometer size={20} />, label: 'Mikroklimat', path: '/monitoring' },
    { icon: <Sprout size={20} />, label: 'Fase Pertumbuhan', path: '/growth' },
    { icon: <Activity size={20} />, label: 'Prediksi Panen', path: '/prediction' },
    { icon: <History size={20} />, label: 'Riwayat Data', path: '/history' },
    { icon: <Settings size={20} />, label: 'Parameter Ambang', path: '/thresholds' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-100 flex flex-col min-h-screen">
      <div className="p-6 flex items-center space-x-3 mb-4 cursor-pointer" onClick={() => navigate('/dashboard')}>
        <div className="w-8 h-8 bg-mag-green rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <h1 className="text-xl font-bold text-gray-800">
          MAG-<span className="text-mag-green">SENSE</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                  ? 'bg-mag-green text-white shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`
            }
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={() => navigate('/login')}
          className="flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl w-full transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
