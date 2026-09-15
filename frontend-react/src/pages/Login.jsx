import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate login for now
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-mag-darker text-gray-300 font-sans">
      <div className="mb-8 flex flex-col items-center">
        <div className="flex items-center space-x-3 mb-2">
          {/* Mock Logo */}
          <div className="w-12 h-12 bg-mag-green rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wider">
            MAG-<span className="text-mag-green">SENSE</span>
          </h1>
        </div>
        <p className="text-sm text-gray-400">Intelligent Monitoring & Control System</p>
      </div>

      <div className="bg-mag-card rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-6">Selamat Datang Kembali</h2>
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                 <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>
              </span>
              <input 
                type="email" 
                className="w-full bg-gray-900/50 border border-gray-700 text-white rounded-lg pl-10 px-4 py-3 focus:outline-none focus:border-mag-green focus:ring-1 focus:ring-mag-green transition-colors"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </span>
              <input 
                type="password" 
                className="w-full bg-gray-900/50 border border-gray-700 text-white rounded-lg pl-10 px-4 py-3 focus:outline-none focus:border-mag-green focus:ring-1 focus:ring-mag-green transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-700 text-mag-green focus:ring-mag-green bg-gray-900" />
              <span className="text-gray-400 hover:text-gray-300">Ingat saya</span>
            </label>
            <a href="#" className="text-mag-green hover:text-green-400 transition-colors">Lupa Password?</a>
          </div>

          <button 
            type="submit" 
            className="w-full bg-mag-green hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center mt-2"
          >
            MASUK KE SISTEM 
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
          </button>
        </form>
      </div>

      <div className="mt-12 text-center text-xs text-gray-500">
        <p>© 2026 MAG-SENSE Project.</p>
        <p>Optimalisasi Budidaya Maggot BSF.</p>
      </div>
    </div>
  );
};

export default Login;
