import React from 'react';
import { TrendingUp, Package, Timer, AlertTriangle, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Prediction() {
  const chartData = [
    { name: 'Box 3', days: 5 },
    { name: 'Box 2', days: 12 },
    { name: 'Box 1', days: 24 },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl text-xs font-bold">
          <p className="text-gray-800">{payload[0].payload.name}</p>
          <p className="text-mag-green mt-1">Estimasi: {payload[0].value} Hari Lagi</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-mag-green to-emerald-500 text-white p-6 rounded-3xl shadow-soft flex flex-col justify-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-green-100">AKURASI MODEL</p>
              <p className="text-3xl font-black">94.2%</p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 flex flex-col justify-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center shadow-inner">
              <Package size={24} className="text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">SIAP PANEN (MINGGU INI)</p>
              <p className="text-3xl font-black text-slate-800">1 <span className="text-sm font-bold text-slate-400">Box</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 flex flex-col justify-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center shadow-inner">
              <Timer size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">RERATA SIKLUS</p>
              <p className="text-3xl font-black text-slate-800">24 <span className="text-sm font-bold text-slate-400">Hari</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
          <span className="w-2 h-6 bg-mag-green rounded-full inline-block shadow-glow"></span>
          Perbandingan Estimasi Panen
        </h3>
        
        <div className="h-[200px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 13, fontWeight: 700}} width={70} />
              <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
              <Bar dataKey="days" radius={[0, 10, 10, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.days <= 7 ? '#f97316' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mt-4">* Box dengan sisa hari paling sedikit ditampilkan paling atas</p>
      </div>

      {/* BOX PREDICTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BOX 3 */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50/50 rounded-3xl shadow-soft border-2 border-orange-200/60 overflow-hidden flex flex-col p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-orange-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">RUANG 3</p>
              <h4 className="text-2xl font-black text-slate-800">BOX #3</h4>
            </div>
            <AlertTriangle className="text-orange-400 animate-pulse" size={28} />
          </div>

          <div className="mb-6 bg-white/50 p-4 rounded-2xl">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">TAHAP SIKLUS</span>
              <span className="text-sm font-black text-orange-500">96%</span>
            </div>
            <div className="h-2 w-full bg-orange-100 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-orange-400 to-amber-500 rounded-full" style={{ width: '96%' }}></div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><TrendingUp size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Mikroklimat</p>
                <p className="text-sm font-bold text-slate-700">Suhu: 32.1°C, RH 75%, Media 65%</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><Package size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Analisis Visual</p>
                <p className="text-sm font-bold text-slate-700">92 Adult Larva, 35 Prepupa</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-center p-6 rounded-2xl mb-5 shadow-soft mt-auto relative overflow-hidden">
            <div className="absolute -top-10 -left-10 text-slate-800 opacity-50 transform -rotate-12"><Timer size={120} /></div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-mag-green uppercase tracking-wider mb-2">PREDIKSI PANEN</p>
              <p className="text-xl font-bold text-white mb-2">24 Apr 2026</p>
              <p className="text-3xl font-black text-orange-400 flex items-center justify-center gap-2">5 <span className="text-sm font-bold text-slate-400">Hari Lagi</span></p>
            </div>
          </div>

          <button className="w-full py-3.5 bg-gradient-to-r from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 text-white shadow-glow-orange font-black text-xs uppercase tracking-wider rounded-xl transition-all hover:shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5">
            SIAPKAN LOGISTIK PANEN <ChevronRight size={18} />
          </button>
        </div>

        {/* BOX 2 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-soft border border-white/50 overflow-hidden flex flex-col p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RUANG 2</p>
              <h4 className="text-2xl font-black text-slate-800">BOX #2</h4>
            </div>
          </div>

          <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">TAHAP SIKLUS</span>
              <span className="text-sm font-black text-mag-green">55%</span>
            </div>
            <div className="h-2 w-full bg-emerald-50 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-mag-green to-emerald-400 rounded-full shadow-glow" style={{ width: '55%' }}></div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><TrendingUp size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Mikroklimat</p>
                <p className="text-sm font-bold text-slate-700">Suhu: 29.5°C, RH 72%, Media 60%</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><Package size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Analisis Visual</p>
                <p className="text-sm font-bold text-slate-700">120 Larva Dewasa, 0 Prepupa</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-center p-6 rounded-2xl shadow-soft mt-auto">
            <p className="text-[10px] font-black text-mag-green uppercase tracking-wider mb-2">PREDIKSI PANEN</p>
            <p className="text-xl font-bold text-white mb-2">04 Mei 2026</p>
            <p className="text-3xl font-black text-mag-green flex items-center justify-center gap-2">12 <span className="text-sm font-bold text-slate-400">Hari Lagi</span></p>
          </div>
        </div>

        {/* BOX 1 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-soft border border-white/50 overflow-hidden flex flex-col p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RUANG 1</p>
              <h4 className="text-2xl font-black text-slate-800">BOX #1</h4>
            </div>
          </div>

          <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">TAHAP SIKLUS</span>
              <span className="text-sm font-black text-mag-green">10%</span>
            </div>
            <div className="h-2 w-full bg-emerald-50 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-mag-green to-emerald-400 rounded-full shadow-glow" style={{ width: '10%' }}></div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><TrendingUp size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Mikroklimat</p>
                <p className="text-sm font-bold text-slate-700">Suhu: 28.2°C, RH 68%, Media 55%</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><Package size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Analisis Visual</p>
                <p className="text-sm font-bold text-slate-700">Ribuan Telur/Penetasan, 15 Baby Larva</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-center p-6 rounded-2xl shadow-soft mt-auto">
            <p className="text-[10px] font-black text-mag-green uppercase tracking-wider mb-2">PREDIKSI PANEN</p>
            <p className="text-xl font-bold text-white mb-2">16 Mei 2026</p>
            <p className="text-3xl font-black text-mag-green flex items-center justify-center gap-2">24 <span className="text-sm font-bold text-slate-400">Hari Lagi</span></p>
          </div>
        </div>

      </div>
    </div>
  );
}