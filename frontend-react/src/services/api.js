import axios from "axios";

// Konfigurasi Base URL agar selalu mengarah ke Central Backend
const getApiUrl = () => {
  if (import.meta.env.DEV) return "/api";
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl;
  }
  return "https://api-capstone.sangkolo.my.id/api";
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor untuk menambahkan token otorisasi jika tersedia
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const handleError = (error, defaultMessage) => {
  console.error(defaultMessage, error);
  throw error.response?.data || new Error(defaultMessage);
};

// --- API FUNCTIONS ---

// 1. Auth & Profile
export const loginUser = async (email, password) => {
  try {
    const response = await api.post("/users/login", { email, password });
    return response.data;
  } catch (error) {
    handleError(error, "Gagal melakukan login");
  }
};

export const getProfile = async () => {
  try {
    const res = await api.get("/users/profile");
    return res.data;
  } catch (e) {
    handleError(e, "Gagal memuat profil");
  }
};

export const updateProfile = async (data) => {
  try {
    const res = await api.put("/users/profile", data);
    return res.data;
  } catch (e) {
    handleError(e, "Gagal memperbarui profil");
  }
};

export const updatePassword = async (data) => {
  try {
    const res = await api.put("/users/profile/password", data);
    return res.data;
  } catch (e) {
    handleError(e, "Gagal memperbarui password");
  }
};

// 2. Users Management
export const getAllUsers = async () => { try { const res = await api.get("/users"); return res.data; } catch (e) { handleError(e, "Gagal memuat users"); } };
export const getUserById = async (id) => { try { const res = await api.get(`/users/${id}`); return res.data; } catch (e) { handleError(e, "Gagal memuat user"); } };
export const createUser = async (data) => { try { const res = await api.post("/users", data); return res.data; } catch (e) { handleError(e, "Gagal membuat user"); } };
export const updateUser = async (id, data) => { try { const res = await api.put(`/users/${id}`, data); return res.data; } catch (e) { handleError(e, "Gagal update user"); } };
export const deleteUser = async (id) => { try { const res = await api.delete(`/users/${id}`); return res.data; } catch (e) { handleError(e, "Gagal menghapus user"); } };

// 3. Tenants Management
export const getAllTenants = async () => { try { const res = await api.get("/tenants"); return res.data; } catch (e) { handleError(e, "Gagal memuat tenants"); } };
export const getTenantById = async (id) => { try { const res = await api.get(`/tenants/${id}`); return res.data; } catch (e) { handleError(e, "Gagal memuat tenant"); } };
export const createTenant = async (data) => { try { const res = await api.post("/tenants", data); return res.data; } catch (e) { handleError(e, "Gagal membuat tenant"); } };
export const updateTenant = async (id, data) => { try { const res = await api.put(`/tenants/${id}`, data); return res.data; } catch (e) { handleError(e, "Gagal update tenant"); } };
export const deleteTenant = async (id) => { try { const res = await api.delete(`/tenants/${id}`); return res.data; } catch (e) { handleError(e, "Gagal menghapus tenant"); } };

// 4. Boxes Management
export const getAllBoxes = async () => { try { const res = await api.get("/boxes"); return res.data; } catch (e) { handleError(e, "Gagal memuat boxes"); } };
export const getBoxById = async (id) => { try { const res = await api.get(`/boxes/${id}`); return res.data; } catch (e) { handleError(e, "Gagal memuat box"); } };
export const createBox = async (data) => { try { const res = await api.post("/boxes", data); return res.data; } catch (e) { handleError(e, "Gagal membuat box"); } };
export const updateBox = async (id, data) => { try { const res = await api.put(`/boxes/${id}`, data); return res.data; } catch (e) { handleError(e, "Gagal update box"); } };
export const deleteBox = async (id) => { try { const res = await api.delete(`/boxes/${id}`); return res.data; } catch (e) { handleError(e, "Gagal menghapus box"); } };

// 5. Automation Thresholds
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getAllThresholds = async (params = {}) => { try { const res = await api.get("/automation-thresholds", { params }); return res.data; } catch (e) { handleError(e, "Gagal memuat thresholds"); } };
export const getThresholds = getAllThresholds;
export const getThresholdByBoxId = async (boxId) => { try { const res = await api.get(`/automation-thresholds/box/${boxId}`); return res.data; } catch (e) { handleError(e, "Gagal memuat threshold box"); } };
export const getThresholdByFloor = async (floorLevel, tenantId) => {
  try {
    const res = await api.get(`/automation-thresholds/floor/${floorLevel}`, { params: tenantId ? { tenant_id: tenantId } : {} });
    return res.data;
  } catch (e) {
    if (e.response?.status === 404) return null;
    handleError(e, "Gagal memuat threshold ruang");
  }
};
export const getThresholdById = async (id) => { try { const res = await api.get(`/automation-thresholds/${id}`); return res.data; } catch (e) { handleError(e, "Gagal memuat threshold"); } };
export const createThreshold = async (data) => { try { const res = await api.post("/automation-thresholds", data); return res.data; } catch (e) { handleError(e, "Gagal membuat threshold"); } };
export const updateThreshold = async (id, data) => { try { const res = await api.put(`/automation-thresholds/${id}`, data); return res.data; } catch (e) { handleError(e, "Gagal update threshold"); } };
export const updateThresholds = async (data) => {
  const payload = { ...data };
  const id = payload.id;

  if (UUID_PATTERN.test(String(id || ""))) {
    try {
      const res = await api.put(`/automation-thresholds/${id}`, payload);
      return res.data;
    } catch (e) {
      if (e.response?.status !== 404) {
        handleError(e, "Gagal update threshold");
      }
    }
  }

  if (payload.floor_level !== undefined && payload.floor_level !== null) {
    try {
      const res = await api.put(`/automation-thresholds/floor/${payload.floor_level}`, payload);
      return res.data;
    } catch (e) {
      handleError(e, "Gagal menyimpan threshold");
    }
  }

  return createThreshold(payload);
};
export const saveThreshold = async (id, data) => updateThresholds({ ...data, id });
export const deleteThreshold = async (id) => { try { const res = await api.delete(`/automation-thresholds/${id}`); return res.data; } catch (e) { handleError(e, "Gagal menghapus threshold"); } };

// 6. Sensor & Actuator Data
export const getAllSensorData = async (params = {}) => { try { const res = await api.get("/sensor-data", { params }); return res.data; } catch (e) { handleError(e, "Gagal memuat sensor data"); } };
export const getSensorData = getAllSensorData;
export const getLatestSensorData = async (boxId) => { try { const res = await api.get("/sensor-data/latest", { params: boxId ? { box_id: boxId } : {} }); return res.data; } catch (e) { handleError(e, "Gagal memuat sensor latest"); } };
export const deleteSensorData = async (id) => { try { const res = await api.delete(`/sensor-data/${id}`); return res.data; } catch (e) { handleError(e, "Gagal menghapus sensor data"); } };

export const getAllCvResults = async (params = {}) => { try { const res = await api.get("/cv-results", { params }); return res.data; } catch (e) { handleError(e, "Gagal memuat CV results"); } };
export const getCvResults = getAllCvResults;
export const getLatestCvResult = async (boxId) => { try { const res = await api.get("/cv-results/latest", { params: boxId ? { box_id: boxId } : {} }); return res.data; } catch (e) { handleError(e, "Gagal memuat CV latest"); } };
export const deleteCvResult = async (id) => { try { const res = await api.delete(`/cv-results/${id}`); return res.data; } catch (e) { handleError(e, "Gagal menghapus CV result"); } };
export const scanFrameCv = async (payload) => { try { const res = await api.post("/cv-results/scan-frame", payload); return res.data; } catch (e) { handleError(e, "Gagal memindai frame kamera"); } };

export const getAllActuatorLogs = async (params = {}) => { try { const res = await api.get("/actuator-logs", { params }); return res.data; } catch (e) { handleError(e, "Gagal memuat actuator logs"); } };
export const getActuatorLogs = getAllActuatorLogs;
export const getLatestActuatorLogs = async (boxId) => { try { const res = await api.get("/actuator-logs/latest", { params: boxId ? { box_id: boxId } : {} }); return res.data; } catch (e) { handleError(e, "Gagal memuat actuator latest"); } };
export const deleteActuatorLog = async (id) => { try { const res = await api.delete(`/actuator-logs/${id}`); return res.data; } catch (e) { handleError(e, "Gagal menghapus actuator log"); } };

export const getAllHarvestPredictions = async (params = {}) => { try { const res = await api.get("/harvest-predictions", { params }); return res.data; } catch (e) { handleError(e, "Gagal memuat harvest predictions"); } };
export const getPredictions = getAllHarvestPredictions;
export const getLatestHarvestPrediction = async (boxId) => { try { const res = await api.get("/harvest-predictions/latest", { params: boxId ? { box_id: boxId } : {} }); return res.data; } catch (e) { handleError(e, "Gagal memuat prediksi panen terbaru"); } };
export const deleteHarvestPrediction = async (id) => { try { const res = await api.delete(`/harvest-predictions/${id}`); return res.data; } catch (e) { handleError(e, "Gagal menghapus harvest prediction"); } };

export const getAllBoxLocations = async () => { try { const res = await api.get("/box-locations"); return res.data; } catch (e) { handleError(e, "Gagal memuat box locations"); } };
export const deleteBoxLocation = async (id) => { try { const res = await api.delete(`/box-locations/${id}`); return res.data; } catch (e) { handleError(e, "Gagal menghapus box location"); } };

// 7. Notifications
export const getAllNotifications = async () => { try { const res = await api.get("/notifications"); return res.data; } catch (e) { handleError(e, "Gagal memuat notifikasi"); } };
export const createNotification = async (data) => { try { const res = await api.post("/notifications", data); return res.data; } catch (e) { handleError(e, "Gagal membuat notifikasi"); } };
export const markNotificationAsRead = async (id) => { try { const res = await api.put(`/notifications/${id}/read`); return res.data; } catch (e) { handleError(e, "Gagal update notifikasi"); } };
export const deleteNotification = async (id) => { try { const res = await api.delete(`/notifications/${id}`); return res.data; } catch (e) { handleError(e, "Gagal menghapus notifikasi"); } };

// 8. Dashboard & History
export const getDashboardSummary = async () => { try { const res = await api.get("/dashboard/summary"); return res.data; } catch (e) { handleError(e, "Gagal memuat ringkasan dashboard"); } };
export const getSensorHistory = async (boxId = "", hours = 24) => {
  try {
    const params = { hours };
    if (boxId) params.box_id = boxId;
    const res = await api.get("/sensor-data/history", { params });
    return res.data;
  } catch (e) {
    handleError(e, "Gagal memuat riwayat sensor");
  }
};
export const getHistoryData = async (hours = 24) => { try { const res = await api.get("/sensor-data/history", { params: { hours } }); return res.data; } catch (e) { handleError(e, "Gagal memuat riwayat data"); } };

export const getAllAutomationThresholds = getAllThresholds;

export default api;
