import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/api';
import maggotLogo from '../assets/maggot.png';
import { useGlobalContext } from '../context/GlobalContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useGlobalContext();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await loginUser(email, password);
      // Panggil fungsi login dari Context
      login(data.user, data.token);
      
      if (data.user.role && data.user.role.toLowerCase() === 'admin') {
        navigate('/manajemen-pengguna');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.error || 'Login gagal, periksa email dan password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 text-slate-800 font-sans relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 blur-3xl"></div>
        <div className="absolute top-[60%] -right-[10%] w-[60%] h-[60%] rounded-full bg-blue-400/10 blur-3xl"></div>
      </div>

      <div className="mb-8 flex flex-col items-center relative z-10">
        <div className="flex items-center space-x-3 mb-2">
          {/* Logo */}
          <div className="w-24 h-24 flex items-center justify-center shrink-0">
            <img src={maggotLogo} alt="Maggot Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-wider">
            MAG-<span className="text-mag-green">SENSE</span>
          </h1>
        </div>
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-2">Intelligent Monitoring & Control System</p>
      </div>

      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 w-full max-w-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 relative z-10">
        <h2 className="text-2xl font-black text-slate-800 mb-6 text-center">Selamat Datang</h2>
        
        {errorMsg && (
          <div className="bg-red-50 border border-red-100 text-red-500 text-sm font-bold px-4 py-3 rounded-2xl mb-6">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-wider">Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                 <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>
              </span>
              <input 
                type="email" 
                className="w-full bg-slate-50 border border-slate-100 text-slate-800 font-bold rounded-2xl pl-12 px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-mag-green transition-all"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-wider">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </span>
              <input 
                type="password" 
                className="w-full bg-slate-50 border border-slate-100 text-slate-800 font-bold rounded-2xl pl-12 px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-mag-green transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded border-slate-200 text-mag-green focus:ring-mag-green bg-white" />
              <span className="text-slate-500 font-medium hover:text-slate-700 transition-colors">Ingat saya</span>
            </label>
            <a href="#" className="text-mag-green font-bold hover:text-green-600 transition-colors">Lupa Password?</a>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-mag-green to-emerald-400 hover:from-emerald-500 hover:to-emerald-600 text-white font-black py-4 px-4 rounded-2xl shadow-glow transition-all hover:shadow-lg hover:-translate-y-0.5 flex justify-center items-center mt-4 disabled:opacity-50"
          >
            {isLoading ? 'MEMPROSES...' : 'MASUK KE SISTEM'} 
            {!isLoading && <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>}
          </button>
        </form>
      </div>

      <div className="mt-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest relative z-10">
        <p>© 2026 MAG-SENSE Project.</p>
        <p className="mt-1">Optimalisasi Budidaya Maggot BSF.</p>
      </div>
    </div>
  );
};

export default Login;
