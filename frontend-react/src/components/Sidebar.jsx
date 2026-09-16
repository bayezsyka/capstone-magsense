import React from 'react';
import { LayoutDashboard, Thermometer, Sprout, History, Settings, LogOut, Activity, Users, X } from 'lucide-react';
import { useNavigate, NavLink } from 'react-router-dom';
import maggotLogo from '../assets/maggot.png';
import { useGlobalContext } from '../context/GlobalContext';

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const { user, logout } = useGlobalContext();

  const userRole = user?.role?.toLowerCase() || '';

  const allMenuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard', roles: ['pembudidaya'] },
    { icon: <Thermometer size={20} />, label: 'Mikroklimat', path: '/monitoring', roles: ['pembudidaya'] },
    { icon: <Sprout size={20} />, label: 'Fase Pertumbuhan', path: '/growth', roles: ['pembudidaya'] },
    { icon: <Activity size={20} />, label: 'Prediksi Panen', path: '/prediction', roles: ['pembudidaya'] },
    { icon: <History size={20} />, label: 'Riwayat Data', path: '/history', roles: ['pembudidaya'] },
    { icon: <Settings size={20} />, label: 'Parameter Ambang', path: '/thresholds', roles: ['pembudidaya'] },
    { icon: <Users size={20} />, label: 'Manajemen Pengguna', path: '/manajemen-pengguna', roles: ['admin'] },
    { icon: <Activity size={20} />, label: 'Manajemen Box', path: '/manajemen-box', roles: ['admin'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <div 
      className={`group fixed inset-y-0 left-0 bg-white/90 backdrop-blur-xl border-r border-slate-200 shadow-2xl flex flex-col min-h-screen z-40 transition-all duration-300 ease-in-out md:relative md:translate-x-0 md:bg-white/80 md:shadow-soft ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'} md:w-20 hover:md:w-64`}
    >
      
      <div className="flex items-center justify-between p-6 mb-2 overflow-hidden whitespace-nowrap">
        <div 
          className={`flex items-center transition-all duration-300 ${userRole === 'admin' ? '' : 'cursor-pointer hover:opacity-80'}`} 
          onClick={() => {
              if (userRole !== 'admin') navigate('/dashboard');
              setIsOpen(false);
          }}
        >
          <div className="w-10 h-10 md:w-8 md:h-8 group-hover:md:w-12 group-hover:md:h-12 flex items-center justify-center shrink-0 transition-all duration-300">
            <img src={maggotLogo} alt="Maggot Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 ml-3 md:opacity-0 md:w-0 md:ml-0 group-hover:md:opacity-100 group-hover:md:w-auto group-hover:md:ml-3 transition-all duration-300">
            MAG-<span className="text-mag-green">SENSE</span>
          </h1>
        </div>
        
        {/* Close Button Mobile */}
        <button className="md:hidden text-slate-400 p-2" onClick={() => setIsOpen(false)}>
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-2 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            onClick={() => setIsOpen(false)}
            className={({ isActive }) => 
              `flex items-center px-4 py-3.5 md:py-3 rounded-2xl transition-all duration-300 font-medium whitespace-nowrap overflow-hidden ${
                isActive 
                  ? 'bg-gradient-to-r from-mag-green to-emerald-400 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:-translate-y-0.5' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-mag-green hover:-translate-y-0.5'
              }`
            }
          >
            <div className="shrink-0 flex items-center justify-center">
              {item.icon}
            </div>
            <span className="font-bold ml-3 md:opacity-0 md:w-0 md:ml-0 group-hover:md:opacity-100 group-hover:md:w-auto group-hover:md:ml-3 transition-all duration-300">
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 overflow-hidden whitespace-nowrap">
        <button 
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="flex items-center px-4 py-3.5 md:py-3 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-2xl w-full transition-all duration-300 font-bold hover:shadow-soft hover:-translate-y-0.5"
        >
          <div className="shrink-0 flex items-center justify-center">
            <LogOut size={20} />
          </div>
          <span className="ml-3 md:opacity-0 md:w-0 md:ml-0 group-hover:md:opacity-100 group-hover:md:w-auto group-hover:md:ml-3 transition-all duration-300">
            Logout
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
