import axios from 'axios';

// Konfigurasi Base URL agar mengarah ke backend-express
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk menambahkan token otorisasi jika tersedia
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Helper untuk menangani error
const handleError = (error, defaultMessage) => {
    console.error(defaultMessage, error.response?.data || error.message);
    throw error.response?.data || new Error(defaultMessage);
};

// --- API FUNCTIONS ---

// 1. AUTH & USERS (TAHAP 1)
export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/users/login', { email, password });
    return response.data;
  } catch (error) {
    handleError(error, 'Gagal login, periksa koneksi Anda.');
  }
};
export const getAllUsers = async () => { try { const res = await api.get('/users'); return res.data; } catch (e) { handleError(e, 'Gagal memuat users'); } };
export const getUserById = async (id) => { try { const res = await api.get(`/users/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal memuat user'); } };
export const createUser = async (data) => { try { const res = await api.post('/users', data); return res.data; } catch (e) { handleError(e, 'Gagal membuat user'); } };
export const updateUser = async (id, data) => { try { const res = await api.put(`/users/${id}`, data); return res.data; } catch (e) { handleError(e, 'Gagal update user'); } };
export const deleteUser = async (id) => { try { const res = await api.delete(`/users/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal menghapus user'); } };

// 2. TENANTS (TAHAP 1)
export const getAllTenants = async () => { try { const res = await api.get('/tenants'); return res.data; } catch (e) { handleError(e, 'Gagal memuat tenants'); } };
export const getTenantById = async (id) => { try { const res = await api.get(`/tenants/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal memuat tenant'); } };
export const createTenant = async (data) => { try { const res = await api.post('/tenants', data); return res.data; } catch (e) { handleError(e, 'Gagal membuat tenant'); } };
export const updateTenant = async (id, data) => { try { const res = await api.put(`/tenants/${id}`, data); return res.data; } catch (e) { handleError(e, 'Gagal update tenant'); } };
export const deleteTenant = async (id) => { try { const res = await api.delete(`/tenants/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal menghapus tenant'); } };

// 3. BOXES (TAHAP 1)
export const getAllBoxes = async () => { try { const res = await api.get('/boxes'); return res.data; } catch (e) { handleError(e, 'Gagal memuat boxes'); } };
export const getBoxById = async (id) => { try { const res = await api.get(`/boxes/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal memuat box'); } };
export const createBox = async (data) => { try { const res = await api.post('/boxes', data); return res.data; } catch (e) { handleError(e, 'Gagal membuat box'); } };
export const updateBox = async (id, data) => { try { const res = await api.put(`/boxes/${id}`, data); return res.data; } catch (e) { handleError(e, 'Gagal update box'); } };
export const deleteBox = async (id) => { try { const res = await api.delete(`/boxes/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal menghapus box'); } };

// 4. AUTOMATION THRESHOLDS (TAHAP 1 & Legacy Compat)
export const getAllThresholds = async () => { try { const res = await api.get('/automation-thresholds'); return res.data; } catch (e) { handleError(e, 'Gagal memuat thresholds'); } };
export const getThresholds = getAllThresholds; // Alias untuk legacy frontend components
export const getThresholdById = async (id) => { try { const res = await api.get(`/automation-thresholds/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal memuat threshold'); } };
export const createThreshold = async (data) => { try { const res = await api.post('/automation-thresholds', data); return res.data; } catch (e) { handleError(e, 'Gagal membuat threshold'); } };
export const updateThreshold = async (id, data) => { try { const res = await api.put(`/automation-thresholds/${id}`, data); return res.data; } catch (e) { handleError(e, 'Gagal update threshold'); } };
export const updateThresholds = async (data) => { // Alias untuk legacy frontend
    try {
        const id = data.id || 1;
        const res = await api.put(`/automation-thresholds/${id}`, data);
        return res.data;
    } catch (e) {
        if (e.response && e.response.status === 404) {
            return await createThreshold(data);
        }
        handleError(e, 'Gagal update threshold');
    }
};
export const deleteThreshold = async (id) => { try { const res = await api.delete(`/automation-thresholds/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal menghapus threshold'); } };

// 5. READ-ONLY DATA (TAHAP 2)
export const getAllSensorData = async () => { try { const res = await api.get('/sensor-data'); return res.data; } catch (e) { handleError(e, 'Gagal memuat sensor data'); } };
export const deleteSensorData = async (id) => { try { const res = await api.delete(`/sensor-data/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal menghapus sensor data'); } };

export const getAllActuatorLogs = async () => { try { const res = await api.get('/actuator-logs'); return res.data; } catch (e) { handleError(e, 'Gagal memuat actuator logs'); } };
export const deleteActuatorLog = async (id) => { try { const res = await api.delete(`/actuator-logs/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal menghapus actuator log'); } };

export const getAllCvResults = async () => { try { const res = await api.get('/cv-results'); return res.data; } catch (e) { handleError(e, 'Gagal memuat cv results'); } };
export const deleteCvResult = async (id) => { try { const res = await api.delete(`/cv-results/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal menghapus cv result'); } };

export const getAllHarvestPredictions = async () => { try { const res = await api.get('/harvest-predictions'); return res.data; } catch (e) { handleError(e, 'Gagal memuat harvest predictions'); } };
export const deleteHarvestPrediction = async (id) => { try { const res = await api.delete(`/harvest-predictions/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal menghapus harvest prediction'); } };

export const getAllBoxLocations = async () => { try { const res = await api.get('/box-locations'); return res.data; } catch (e) { handleError(e, 'Gagal memuat box locations'); } };
export const deleteBoxLocation = async (id) => { try { const res = await api.delete(`/box-locations/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal menghapus box location'); } };

// 6. NOTIFICATIONS (TAHAP 2)
export const getAllNotifications = async () => { try { const res = await api.get('/notifications'); return res.data; } catch (e) { handleError(e, 'Gagal memuat notifikasi'); } };
export const markNotificationAsRead = async (id) => { try { const res = await api.put(`/notifications/${id}/read`); return res.data; } catch (e) { handleError(e, 'Gagal update notifikasi'); } };
export const deleteNotification = async (id) => { try { const res = await api.delete(`/notifications/${id}`); return res.data; } catch (e) { handleError(e, 'Gagal menghapus notifikasi'); } };

// MISC LOGIC
export const getDashboardSummary = async () => { try { const res = await api.get('/dashboard/summary'); return res.data; } catch (e) { handleError(e, 'Gagal memuat ringkasan dashboard'); } };
export const getSensorHistory = async (boxId = '') => { try { const url = boxId ? `/boxes/${boxId}/sensor-history` : '/edge-sync/history'; const res = await api.get(url); return res.data; } catch (e) { handleError(e, 'Gagal memuat riwayat sensor'); } };
export const getHistoryData = async () => { try { const res = await api.get('/sensor-data/history'); return res.data; } catch (e) { handleError(e, 'Gagal memuat riwayat data'); } };

export default api;
