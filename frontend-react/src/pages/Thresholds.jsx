import { useState, useEffect } from 'react';
import { Save, AlertCircle, RotateCcw, Box, Thermometer, Droplets, Wind, ArrowRightLeft } from 'lucide-react';
import { getThresholds, updateThresholds } from '../services/api';
import toast from 'react-hot-toast';

export default function Thresholds() {
  const [activeTab, setActiveTab] = useState(1);
  const [form, setForm] = useState({
    tempMin: 25,
    tempMax: 35,
    mediaMin: 40,
    mediaMax: 65,
    humAirMin: 60,
    humAirMax: 85
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const data = await getThresholds();
        if (data && data.length > 0) {
          const latest = data[data.length - 1]; // Assume the latest config
          setForm({
            id: latest.id,
            tempMin: latest.temp_min || 25,
            tempMax: latest.temp_max || 35,
            mediaMin: latest.media_hum_min || 40,
            mediaMax: latest.media_hum_max || 65,
            humAirMin: latest.air_hum_min || 60,
            humAirMax: latest.air_hum_max || 85
          });
        }
      } catch (error) {
        console.error("Gagal memuat threshold:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchThresholds();
  }, [activeTab]);

  const handleReset = () => {
    toast((t) => (
      <div className="space-y-4">
        <p className="font-bold text-slate-800">Kembalikan pengaturan ke default pabrik?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">Batal</button>
          <button onClick={() => { 
            toast.dismiss(t.id);
            setForm({
              ...form,
              tempMin: 25,
              tempMax: 35,
              mediaMin: 40,
              mediaMax: 65,
              humAirMin: 60,
              humAirMax: 85
            });
            toast.success('Pengaturan direset ke default');
          }} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-colors">Reset</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadId = toast.loading('Menyimpan perubahan...');
    try {
      await updateThresholds({
        id: form.id || 1, // Default to 1 if not exists
        temp_min: parseFloat(form.tempMin),
        temp_max: parseFloat(form.tempMax),
        media_hum_min: activeTab === 4 ? null : parseFloat(form.mediaMin),
        media_hum_max: activeTab === 4 ? null : parseFloat(form.mediaMax),
        air_hum_min: parseFloat(form.humAirMin),
        air_hum_max: parseFloat(form.humAirMax),
        tenant_id: 1, // Dummy tenant
        floor_level: activeTab
      });
      toast.success(`Berhasil menyimpan perubahan untuk Ruang ${activeTab}!`, { id: loadId });
    } catch (error) {
      toast.error('Gagal menyimpan perubahan: ' + error.message, { id: loadId });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER INFO */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-100/50 border border-emerald-200/50 p-6 rounded-2xl flex items-start gap-4 mb-6 shadow-inner">
        <div className="p-2 bg-white rounded-xl shadow-sm text-mag-green shrink-0">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-800">
            Panduan Konfigurasi Multi-Ruang
          </h4>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
            Pilih nomor Ruang terlebih dahulu sebelum mengubah parameter. Parameter di bawah ini akan menentukan kapan aktuator pada Ruang tersebut menyala secara otomatis.
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[1, 2, 3, 4].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black transition-all border ${
              activeTab === tab
                ? 'bg-mag-green/10 text-mag-green border-mag-green/20'
                : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
            }`}
          >
            <Box size={14} />
            RUANG {tab}
          </button>
        ))}
      </div>

      {/* CARD SETTINGS */}
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 transition-all duration-300">
        <div className="mb-8 inline-block px-4 py-1.5 bg-mag-green/10 rounded-full">
          <span className="text-xs font-black text-mag-green uppercase tracking-wider">
            RUANG KANDANG {activeTab}
          </span>
        </div>

        <form className="space-y-10" onSubmit={handleSubmit}>
          {/* SUHU UDARA */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-mag-green uppercase tracking-wider flex items-center gap-2">
              <Thermometer size={18} />
              AMBANG SUHU UDARA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Suhu Minimum (°C)</label>
                <input
                  type="number"
                  value={form.tempMin}
                  onChange={(e) => setForm({...form, tempMin: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-mag-green outline-none font-bold text-slate-800 text-sm transition-all"
                />
                <p className="text-[10px] text-slate-400 font-medium italic">Heater aktif jika suhu turun di bawah batas ini.</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Suhu Maksimum (°C)</label>
                <input
                  type="number"
                  value={form.tempMax}
                  onChange={(e) => setForm({...form, tempMax: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-mag-green outline-none font-bold text-slate-800 text-sm transition-all"
                />
                <p className="text-[10px] text-slate-400 font-medium italic">Kipas aktif jika suhu melebihi batas ini.</p>
              </div>
            </div>
          </div>

          {/* KELEMBAPAN MEDIA (Hide for Ruang 4) */}
          {activeTab !== 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-blue-500 uppercase tracking-wider flex items-center gap-2">
                <Droplets size={18} />
                AMBANG KELEMBAPAN MEDIA
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Kelembapan Min (%)</label>
                  <input
                    type="number"
                    value={form.mediaMin}
                    onChange={(e) => setForm({...form, mediaMin: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm transition-all"
                  />
                  <p className="text-[10px] text-slate-400 font-medium italic">Memulai penyiraman otomatis.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Kelembapan Maks (%)</label>
                  <input
                    type="number"
                    value={form.mediaMax}
                    onChange={(e) => setForm({...form, mediaMax: e.target.value})}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-slate-800 text-sm transition-all"
                  />
                  <p className="text-[10px] text-slate-400 font-medium italic">Menghentikan penyiraman otomatis.</p>
                </div>
              </div>
            </div>
          )}

          {/* KELEMBAPAN UDARA */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-indigo-500 uppercase tracking-wider flex items-center gap-2">
              <Wind size={18} />
              AMBANG KELEMBAPAN UDARA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">RH Min (%)</label>
                <input
                  type="number"
                  value={form.humAirMin}
                  onChange={(e) => setForm({...form, humAirMin: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-800 text-sm transition-all"
                />
                <p className="text-[10px] text-slate-400 font-medium italic">Mengaktifkan humidifier.</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">RH Maks (%)</label>
                <input
                  type="number"
                  value={form.humAirMax}
                  onChange={(e) => setForm({...form, humAirMax: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-800 text-sm transition-all"
                />
                <p className="text-[10px] text-slate-400 font-medium italic">Mengaktifkan kipas exhaust.</p>
              </div>
            </div>
          </div>

          {/* BUTTON */}
          <div className="flex flex-col md:flex-row items-center justify-end gap-6 pt-10 border-t border-slate-100 mt-10">
            <button
              type="button"
              onClick={handleReset}
              className="w-full md:w-auto text-slate-500 font-black hover:text-slate-700 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <RotateCcw size={16} />
              Reset Default
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto px-8 py-3 bg-mag-green hover:bg-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-emerald-500/30 text-sm disabled:opacity-50"
            >
              <Save size={16} />
              SIMPAN Ruang {activeTab}
            </button>
          </div>
        </form>
      </div>

      {/* RELOKASI BOX */}
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 transition-all duration-300 mt-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500 shrink-0">
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">RELOKASI BOX</h4>
            <p className="text-xs text-slate-400 font-medium mt-1">Pindahkan unit box ke ruang kandang lain. Perubahan disimpan ke database.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Pilih Unit Box</label>
            <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-800 text-sm transition-all appearance-none cursor-pointer">
              <option>Box 1 — Ruang 1</option>
              <option>Box 2 — Ruang 1</option>
              <option>Box 3 — Ruang 2</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Pindah Ke Ruang</label>
            <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-800 text-sm transition-all appearance-none cursor-pointer">
              <option>Ruang 1</option>
              <option>Ruang 2</option>
              <option>Ruang 3</option>
              <option>Ruang 4</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Slot (Opsional)</label>
            <input 
              type="text" 
              placeholder="Contoh: A1"
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none font-bold text-slate-800 text-sm transition-all"
            />
          </div>
        </div>
        <div className="mt-6">
          <button className="px-8 py-3 bg-[#5D4EFA] hover:bg-[#4b3be0] text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-indigo-500/30 text-sm w-full md:w-auto">
            <ArrowRightLeft size={16} />
            Simpan Lokasi
          </button>
        </div>
      </div>
      
    </div>
  );
}