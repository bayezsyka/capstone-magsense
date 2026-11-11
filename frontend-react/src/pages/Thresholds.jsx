import { useState, useEffect } from 'react';
import { Save, AlertCircle, RotateCcw, Thermometer, Droplets, Wind } from 'lucide-react';
import { getAllThresholds, updateThresholds } from '../services/api';
import { useGlobalContext } from '../context/GlobalContext';
import toast from 'react-hot-toast';

const DEFAULT_FORM = {
  tempMin: 25,
  tempMax: 35,
  mediaMin: 40,
  mediaMax: 65,
  humAirMin: 60,
  humAirMax: 85
};

export default function Thresholds() {
  const { user } = useGlobalContext();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchThresholds = async () => {
      setIsLoading(true);
      try {
        const thresholds = await getAllThresholds(user?.tenant_id ? { tenant_id: user.tenant_id } : {});
        if (!isMounted) return;

        const threshold = Array.isArray(thresholds) && thresholds.length > 0 ? thresholds[0] : null;

        if (threshold) {
          setForm({
            id: threshold.id,
            tempMin: threshold.temp_min ?? DEFAULT_FORM.tempMin,
            tempMax: threshold.temp_max ?? DEFAULT_FORM.tempMax,
            mediaMin: threshold.media_hum_min ?? DEFAULT_FORM.mediaMin,
            mediaMax: threshold.media_hum_max ?? DEFAULT_FORM.mediaMax,
            humAirMin: threshold.air_hum_min ?? DEFAULT_FORM.humAirMin,
            humAirMax: threshold.air_hum_max ?? DEFAULT_FORM.humAirMax
          });
        } else {
          setForm({ ...DEFAULT_FORM });
        }
      } catch (error) {
        console.error("Gagal memuat threshold:", error);
        if (isMounted) setForm({ ...DEFAULT_FORM });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchThresholds();
    return () => { isMounted = false; };
  }, [user?.tenant_id]);

  const handleReset = () => {
    toast((t) => (
      <div className="space-y-4">
        <p className="font-bold text-slate-800">Kembalikan pengaturan ke default pabrik?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">Batal</button>
          <button onClick={() => { 
            toast.dismiss(t.id);
            setForm({ ...DEFAULT_FORM, id: form.id });
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
      const payload = {
        temp_min: parseFloat(form.tempMin),
        temp_max: parseFloat(form.tempMax),
        media_hum_min: parseFloat(form.mediaMin),
        media_hum_max: parseFloat(form.mediaMax),
        air_hum_min: parseFloat(form.humAirMin),
        air_hum_max: parseFloat(form.humAirMax),
        floor_level: 1
      };

      if (form.id) payload.id = form.id;
      if (user?.tenant_id) payload.tenant_id = user.tenant_id;

      const saved = await updateThresholds(payload);
      if (saved?.id) setForm(prev => ({ ...prev, id: saved.id }));
      toast.success('Berhasil menyimpan perubahan parameter ambang!', { id: loadId });
    } catch (error) {
      toast.error('Gagal menyimpan perubahan: ' + (error.error || error.message), { id: loadId });
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
            Panduan Konfigurasi Parameter Ambang
          </h4>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
            Parameter di bawah ini akan menentukan kapan aktuator menyala secara otomatis. Pengaturan ini berlaku untuk seluruh sistem.
          </p>
        </div>
      </div>

      {/* CARD SETTINGS */}
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 transition-all duration-300">
        <div className="mb-8 inline-block px-4 py-1.5 bg-mag-green/10 rounded-full">
          <span className="text-xs font-black text-mag-green uppercase tracking-wider">
            PENGATURAN AMBANG OTOMATIS
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

          {/* KELEMBAPAN MEDIA */}
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
              SIMPAN PARAMETER
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}