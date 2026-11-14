import React, { useState, useEffect, useCallback } from "react";
import { GlobalContext } from "./GlobalContext.js";
import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (import.meta.env.DEV) return undefined;
  const wsEnv = import.meta.env.VITE_WS_URL;
  if (wsEnv && wsEnv.startsWith("http")) {
    return wsEnv;
  }
  const apiEnv = import.meta.env.VITE_API_URL;
  if (apiEnv && apiEnv.startsWith("http")) {
    return apiEnv.replace(/\/api\/?$/, "");
  }
  return "https://api-capstone.sangkolo.my.id";
};

const SOCKET_URL = getSocketUrl();

export const GlobalProvider = ({ children }) => {
  // --- Auth State ---
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || null);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", authToken);
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }, []);

  // --- WebSocket State ---
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [realtimeData, setRealtimeData] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    // Connect to Central WebSocket Server
    const newSocket = io(SOCKET_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      autoConnect: true,
      transports: ["websocket", "polling"],
      auth: token ? { token } : {}
    });

    newSocket.on("connect", () => {
      console.log("Terhubung ke Central WebSocket Server:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      console.warn("Terputus dari WebSocket Server:", reason);
      setIsConnected(false);
    });

    const bumpRefresh = () => setRefreshVersion((version) => version + 1);

    newSocket.on("new_sensor_data", (data) => {
      setRealtimeData(data);
    });
    newSocket.on("new_harvest_predictions", bumpRefresh);
    newSocket.on("new_cv_results", bumpRefresh);
    newSocket.on("new_actuator_logs", bumpRefresh);
    newSocket.on("new_notification", bumpRefresh);
    newSocket.on("cv_update", bumpRefresh);

    // oxlint-disable-next-line react/set-state-in-effect
    setSocket(newSocket);

    return () => {
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("new_sensor_data");
      newSocket.off("new_harvest_predictions");
      newSocket.off("new_cv_results");
      newSocket.off("new_actuator_logs");
      newSocket.off("new_notification");
      newSocket.off("cv_update");
      newSocket.disconnect();
    };
  }, [token]);

  const value = {
    user,
    token,
    login,
    logout,
    socket,
    isConnected,
    realtimeData,
    refreshVersion
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};
