// src/pages/Profile.jsx
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import config from '../config';
import { User, Camera, Lock, KeyRound, Save, AlertCircle, CheckCircle2 } from 'lucide-react';

const API_BASE = config.API_URL;

export default function Profile() {
  const fileInputRef = useRef(null);

  // Data user awal (Mock State)
  const [profile, setProfile] = useState({
    name: 'Pembudidaya',
    email: 'admin@maggott.com',
    avatar: null, // Berisi URL objek gambar saat di-upload
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    axios.get(`${API_BASE}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setProfile({ ...profile, name: res.data.username, email: res.data.email }))
      .catch(err => console.error("Profile Fetch Error:", err));
  }, []);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // State Notifikasi/Umpan Balik
  const [status, setStatus] = useState({ type: '', message: '' });

  // Handle Perubahan Input Teks Profil
  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  // Handle Perubahan Input Teks Password
  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  // Handle Unggah & Preview Foto Profil
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // Batas maksimal ukuran file 10MB
        showNotification('error', 'Ukuran gambar maksimal adalah 10MB');
        return;
      }
      const imageUrl = URL.createObjectURL(file);
      setProfile({ ...profile, avatar: imageUrl });
      showNotification('success', 'Pratinjau foto profil berhasil diperbarui!');
    }
  };

  // Trigger klik pada input file tersembunyi
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Fungsi Helper Notifikasi
  const showNotification = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => setStatus({ type: '', message: '' }), 4000);
  };

  // Submit Perubahan Profil (Nama & Email)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profile.name.trim()) {
      showNotification('error', 'Nama pengguna tidak boleh kosong');
      return;
    }
    const token = localStorage.getItem("token");
    try {
      await axios.put(`${API_BASE}/api/profile`, { name: profile.name }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification('success', 'Informasi profil Anda berhasil diperbarui!');
    } catch (err) {
      showNotification('error', 'Gagal memperbarui profil');
    }
  };

  // Submit Perubahan Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification('error', 'Semua kolom kata sandi wajib diisi');
      return;
    }
    if (newPassword.length < 6) {
      showNotification('error', 'Kata sandi baru minimal harus 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('error', 'Konfirmasi kata sandi baru tidak cocok');
      return;
    }

    const token = localStorage.getItem("token");
    try {
      await axios.put(`${API_BASE}/api/profile/password`, { currentPassword, newPassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification('success', 'Kata sandi Anda sukses diperbarui!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showNotification('error', err.response?.data?.message || 'Gagal memperbarui kata sandi');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

      {/* BANNER NOTIFIKASI */}
      {status.message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all animate-fadeIn ${status.type === 'success'
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
          : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <p className="text-sm font-semibold">{status.message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* KARTU FOTO PROFIL */}
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-white/50 shadow-soft flex flex-col items-center justify-center text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-wider mb-6">Foto Profil</p>

          <div className="relative group cursor-pointer" onClick={triggerFileInput}>
            <div className="w-32 h-32 rounded-3xl bg-slate-50 border-4 border-white shadow-glow overflow-hidden flex items-center justify-center transition-transform group-hover:scale-105 group-hover:rotate-3">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-slate-400" />
              )}
            </div>
            {/* Overlay Hover Unggah */}
            <div className="absolute inset-0 bg-mag-green/20 backdrop-blur-sm rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Camera size={28} className="text-white drop-shadow-md" />
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={triggerFileInput}
            className="mt-6 text-xs font-black text-mag-green hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2.5 px-5 rounded-xl transition-all hover:shadow-sm"
          >
            Pilih Foto Baru
          </button>
          <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-wider">Mendukung format JPG, PNG. Maks 10MB.</p>
        </div>

        {/* FORM DATA PENGGUNA */}
        <div className="md:col-span-2 bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-white/50 shadow-soft transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-4 mb-6">Informasi Akun</h3>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Nama Lengkap</label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleProfileChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-mag-green transition-all"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Alamat Email</label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleProfileChange}
                className="w-full px-5 py-3.5 rounded-2xl border border-slate-100 text-sm font-bold bg-slate-100/50 text-slate-400 cursor-not-allowed"
                disabled
              />
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wider">Email utama tidak dapat diubah demi keamanan akun.</p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-mag-green to-emerald-400 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-xs font-black shadow-glow hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <Save size={16} /> Simpan Perubahan
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* FORM PENGATURAN KATA SANDI */}
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-white/50 shadow-soft transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-4 mb-6 flex items-center gap-3">
          <Lock size={20} className="text-mag-green" /> Keamanan & Kata Sandi
        </h3>

        <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-2xl">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Kata Sandi Saat Ini</label>
            <input
              type="password"
              name="currentPassword"
              value={passwordData.currentPassword}
              onChange={handlePasswordChange}
              className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-mag-green transition-all"
              placeholder="••••••••"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Kata Sandi Baru</label>
              <input
                type="password"
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-mag-green transition-all"
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Konfirmasi Kata Sandi Baru</label>
              <input
                type="password"
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-mag-green transition-all"
                placeholder="Ulangi kata sandi baru"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-soft hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <KeyRound size={16} /> Perbarui Kata Sandi
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}