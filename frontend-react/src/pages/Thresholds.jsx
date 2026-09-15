import { useState } from 'react';
import { Save, AlertCircle, RotateCcw } from 'lucide-react';

export default function Thresholds() {
  const [form, setForm] = useState({
    tempMin: 25,
    tempMax: 32,
    mediaMin: 40,
    mediaMax: 65,
    humAirMin: 60,
    humAirMax: 85
  });

  const handleReset = () => {
    if (window.confirm("Kembalikan pengaturan ke default pabrik?")) {
      setForm({
        tempMin: 25,
        tempMax: 32,
        mediaMin: 40,
        mediaMax: 65,
        humAirMin: 60,
        humAirMax: 85
      });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER INFO */}
      <div className="bg-green-50/50 border border-green-100 p-4 rounded-xl flex items-start gap-4 mb-8">
        <div className="p-1.5 text-mag-green rounded-lg">
          <AlertCircle size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-800">
            Panduan Konfigurasi
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            Parameter di bawah ini akan menentukan kapan aktuator menyala otomatis. Pastikan nilai minimum tidak lebih besar dari maksimum.
          </p>
        </div>
      </div>

      {/* CARD */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <form className="space-y-10">

          {/* SUHU UDARA */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-mag-green uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-mag-green rounded-full inline-block"></span>
              Ambang Suhu Udara
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Suhu Minimum (°C)</label>
                <input
                  type="number"
                  value={form.tempMin}
                  onChange={(e) => setForm({...form, tempMin: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none font-semibold text-sm"
                />
                <p className="text-[10px] text-gray-400 italic">Heater aktif jika suhu turun di bawah batas ini.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Suhu Maksimum (°C)</label>
                <input
                  type="number"
                  value={form.tempMax}
                  onChange={(e) => setForm({...form, tempMax: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none font-semibold text-sm"
                />
                <p className="text-[10px] text-gray-400 italic">Kipas aktif jika suhu melebihi batas ini.</p>
              </div>
            </div>
          </div>

          {/* KELEMBAPAN MEDIA */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-blue-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-blue-500 rounded-full inline-block"></span>
              Ambang Kelembapan Media
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Kelembapan Min (%)</label>
                <input
                  type="number"
                  value={form.mediaMin}
                  onChange={(e) => setForm({...form, mediaMin: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-sm"
                />
                <p className="text-[10px] text-gray-400 italic">Memulai penyiraman otomatis.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase">Kelembapan Maks (%)</label>
                <input
                  type="number"
                  value={form.mediaMax}
                  onChange={(e) => setForm({...form, mediaMax: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-sm"
                />
                <p className="text-[10px] text-gray-400 italic">Menghentikan penyiraman otomatis.</p>
              </div>
            </div>
          </div>

          {/* KELEMBAPAN UDARA */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-indigo-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block"></span>
              Ambang Kelembapan Udara
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase">RH Min (%)</label>
                <input
                  type="number"
                  value={form.humAirMin}
                  onChange={(e) => setForm({...form, humAirMin: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-sm"
                />
                <p className="text-[10px] text-gray-400 italic">Mengaktifkan humidifier.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase">RH Maks (%)</label>
                <input
                  type="number"
                  value={form.humAirMax}
                  onChange={(e) => setForm({...form, humAirMax: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-sm"
                />
                <p className="text-[10px] text-gray-400 italic">Mengaktifkan kipas exhaust.</p>
              </div>
            </div>
          </div>

          {/* BUTTON */}
          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-8 border-t border-gray-100 mt-10">
            <button
              type="button"
              onClick={handleReset}
              className="w-full md:w-auto px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition flex items-center justify-center gap-2 text-sm"
            >
              <RotateCcw size={16} />
              Reset Default
            </button>
            <button
              type="button"
              className="w-full md:w-auto px-8 py-3 bg-mag-green hover:bg-green-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition text-sm"
            >
              <Save size={16} />
              TERAPKAN PERUBAHAN
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}