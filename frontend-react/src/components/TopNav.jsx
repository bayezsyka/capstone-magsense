import React, { useState, useEffect, useRef } from 'react';
import { useGlobalContext } from '../context/GlobalContext';
import { Link, useLocation } from 'react-router-dom';
import { Bell, ChevronRight, CheckCircle2, Menu } from 'lucide-react';
import { getAllNotifications, markNotificationAsRead } from '../services/api';
import toast from 'react-hot-toast';

const TopNav = ({ onMenuClick }) => {
  const { user } = useGlobalContext();
  const location = useLocation();
  
  const [notifications, setNotifications] = useState([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);
  
  const pathName = location.pathname.split('/')[1] || 'Dashboard';
  const pageTitle = pathName.charAt(0).toUpperCase() + pathName.slice(1).replace('-', ' ');
  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'US';

  const fetchNotif = async () => {
    try {
      const data = await getAllNotifications();
      setNotifications(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotif();
    // Click outside to close
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      fetchNotif();
    } catch (e) {
      toast.error('Gagal menandai notifikasi');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center text-gray-500 text-sm">
          <span className="text-gray-400 hidden md:block"><ChevronRight size={16} /></span>
          <span className="font-semibold text-gray-800 md:ml-2">{pageTitle}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-6">
        
        {/* NOTIFICATIONS */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotif(!showNotif)}
            className="relative text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {/* DROPDOWN */}
          {showNotif && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-800">Notifikasi</h3>
                {unreadCount > 0 && <span className="text-[10px] font-bold text-mag-green bg-emerald-50 px-2 py-0.5 rounded-full">{unreadCount} Baru</span>}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">Belum ada notifikasi</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-4 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-emerald-50/30' : ''}`}>
                        <p className={`text-xs ${!n.is_read ? 'font-bold text-slate-800' : 'text-slate-500'}`}>{n.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-slate-400">{new Date(n.timestamp).toLocaleString()}</span>
                          {!n.is_read && (
                            <button 
                              onClick={() => handleMarkAsRead(n.id)}
                              className="text-[10px] text-mag-green flex items-center gap-1 font-bold hover:text-emerald-700"
                            >
                              <CheckCircle2 size={12} /> Tandai dibaca
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <Link to="/profile" className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-mag-green uppercase tracking-wider">{user?.role || 'Active Role'}</p>
            <p className="text-sm font-bold text-slate-800">{user?.username || 'User Profile'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-green-50 border-2 border-white shadow-soft flex items-center justify-center shrink-0">
            <span className="text-mag-green font-black text-sm">{initials}</span>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default TopNav;
