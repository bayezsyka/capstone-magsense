import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Growth from './pages/Growth';
import History from './pages/History';
import Monitoring from './pages/Monitoring';
import Prediction from './pages/Prediction';
import Profile from './pages/Profile';
import Thresholds from './pages/Thresholds';
import ManajemenPengguna from './pages/ManajemenPengguna';
import ManajemenBox from './pages/ManajemenBox';
import AppLayout from './components/AppLayout';

import { GlobalProvider, useGlobalContext } from './context/GlobalContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, token } = useGlobalContext();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  try {
    // Check role if required
    if (requiredRole) {
      if (user.role !== requiredRole && user.role?.toLowerCase() !== requiredRole.toLowerCase()) {
        // If not authorized for this route, redirect based on their role
        if (user.role?.toLowerCase() === 'admin') {
           return <Navigate to="/manajemen-pengguna" replace />;
        } else {
           return <Navigate to="/dashboard" replace />;
        }
      }
    }
    
    return children;
  } catch (e) {
    return <Navigate to="/login" replace />;
  }
};

import { Toaster } from 'react-hot-toast';
import OfflineReady from './components/OfflineReady';

function App() {
  return (
    <GlobalProvider>
      <Toaster position="top-right" />
      <OfflineReady />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected/Layout Routes */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            {/* Pembudidaya Only Routes */}
            <Route path="/dashboard" element={<ProtectedRoute requiredRole="pembudidaya"><Dashboard /></ProtectedRoute>} />
            <Route path="/growth" element={<ProtectedRoute requiredRole="pembudidaya"><Growth /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute requiredRole="pembudidaya"><History /></ProtectedRoute>} />
            <Route path="/monitoring" element={<ProtectedRoute requiredRole="pembudidaya"><Monitoring /></ProtectedRoute>} />
            <Route path="/prediction" element={<ProtectedRoute requiredRole="pembudidaya"><Prediction /></ProtectedRoute>} />
            <Route path="/thresholds" element={<ProtectedRoute requiredRole="pembudidaya"><Thresholds /></ProtectedRoute>} />
            
            {/* Profile bisa diakses semua */}
            <Route path="/profile" element={<Profile />} />
            <Route 
              path="/manajemen-pengguna" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <ManajemenPengguna />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manajemen-box" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <ManajemenBox />
                </ProtectedRoute>
              } 
            />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </GlobalProvider>
  );
}

export default App;
