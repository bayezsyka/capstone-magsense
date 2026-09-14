import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import Layout
import MainLayout from './components/MainLayout';

// Import Halaman
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Monitoring from './pages/Monitoring';
import Thresholds from './pages/Thresholds';
import Growth from './pages/Growth';
import Prediction from './pages/Prediction';
import HistoryPage from './pages/History';
import Profile from './pages/Profile';
import CameraSender from './components/CameraSender';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <Router>
      <Routes>
        {/* Rute publik: Bisa dibuka di HP tanpa Login untuk simulasi kamera */}
        <Route path="/camera" element={<CameraSender />} />

        {/* Rute Login: Jika sudah ada token, otomatis ke dashboard */}
        <Route 
          path="/login" 
          element={!token ? <Login setToken={setToken} /> : <Navigate to="/" />} 
        />

        {/* Rute Terproteksi: Harus Login */}
        {token ? (
          <Route element={<MainLayout setToken={setToken} />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/monitoring" element={<Monitoring />} />
            <Route path="/thresholds" element={<Thresholds />} />
            <Route path="/growth" element={<Growth />} />
            <Route path="/prediction" element={<Prediction />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        ) : (
          /* Jika belum login dan mencoba akses rute lain, arahkan ke /login */
          <Route path="*" element={<Navigate to="/login" />} />
        )}

        {/* Fallback rute tidak ditemukan */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;