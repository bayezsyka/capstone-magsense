import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Growth from "./pages/Growth";
import History from "./pages/History";
import Monitoring from "./pages/Monitoring";
import Prediction from "./pages/Prediction";
import Profile from "./pages/Profile";
import Thresholds from "./pages/Thresholds";
import ManajemenPengguna from "./pages/ManajemenPengguna";
import ManajemenBox from "./pages/ManajemenBox";
import AppLayout from "./components/AppLayout";

import { GlobalProvider, useGlobalContext } from "./context/GlobalContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useGlobalContext();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  try {
    if (allowedRoles && allowedRoles.length > 0) {
      const userRole = (user.role || "").toLowerCase();
      const rolesNormalized = allowedRoles.map(r => r.toLowerCase());
      
      if (!rolesNormalized.includes(userRole)) {
        if (userRole === "admin") {
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

import { Toaster } from "react-hot-toast";
import OfflineReady from "./components/OfflineReady";

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
            {/* Operational Routes for Pembudidaya & Operator */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["pembudidaya", "operator"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/growth" element={<ProtectedRoute allowedRoles={["pembudidaya", "operator"]}><Growth /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute allowedRoles={["pembudidaya", "operator"]}><History /></ProtectedRoute>} />
            <Route path="/monitoring" element={<ProtectedRoute allowedRoles={["pembudidaya", "operator"]}><Monitoring /></ProtectedRoute>} />
            <Route path="/prediction" element={<ProtectedRoute allowedRoles={["pembudidaya", "operator"]}><Prediction /></ProtectedRoute>} />
            <Route path="/thresholds" element={<ProtectedRoute allowedRoles={["pembudidaya", "operator"]}><Thresholds /></ProtectedRoute>} />
            
            {/* Profile */}
            <Route path="/profile" element={<Profile />} />

            {/* Admin Only Routes */}
            <Route 
              path="/manajemen-pengguna" 
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ManajemenPengguna />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manajemen-box" 
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
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
