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
        <div className="bg-mag-green text-white p-5 rounded-2xl shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-100">AKURASI MODEL</p>
              <p className="text-2xl font-black">94.2%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Package size={20} className="text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">SIAP PANEN (MINGGU INI)</p>
              <p className="text-2xl font-black text-gray-800">1 <span className="text-sm font-bold text-gray-500">Box</span></p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Timer size={20} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">RERATA SIKLUS</p>
              <p className="text-2xl font-black text-gray-800">24 <span className="text-sm font-bold text-gray-500">Hari</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-black text-gray-800 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-mag-green rounded-full inline-block"></span>
          Perbandingan Estimasi Panen
        </h3>
        
        <div className="h-[200px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 700}} width={60} />
              <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />} />
              <Bar dataKey="days" radius={[0, 8, 8, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.days <= 7 ? '#f97316' : '#00b074'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-gray-400 text-center italic mt-2">* Box dengan sisa hari paling sedikit ditampilkan paling atas</p>
      </div>

      {/* BOX PREDICTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* BOX 3 */}
        <div className="bg-orange-50/30 rounded-2xl shadow-sm border-2 border-orange-200 overflow-hidden flex flex-col p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RUANG 3</p>
              <h4 className="text-xl font-black text-gray-800">BOX #3</h4>
            </div>
            <AlertTriangle className="text-orange-400" size={24} />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-gray-600 uppercase">TAHAP SIKLUS</span>
              <span className="text-sm font-black text-orange-500">96%</span>
            </div>
            <div className="h-1.5 w-full bg-orange-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: '96%' }}></div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-gray-400"><TrendingUp size={14} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status Mikroklimat</p>
                <p className="text-xs font-medium text-gray-700">Suhu: 32.1°C, RH 75%, Media 65%</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-gray-400"><Package size={14} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Analisis Visual</p>
                <p className="text-xs font-medium text-gray-700">92 Adult Larva, 35 Prepupa</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] text-center p-5 rounded-xl mb-4 shadow-inner mt-auto">
            <p className="text-[10px] font-bold text-mag-green uppercase tracking-wider mb-2">PREDIKSI PANEN</p>
            <p className="text-lg font-black text-white mb-2">24 Apr 2026</p>
            <p className="text-2xl font-black text-orange-400 flex items-center justify-center gap-1">5 <span className="text-sm font-medium text-gray-400">Hari Lagi</span></p>
          </div>

          <button className="w-full py-3 bg-orange-100 hover:bg-orange-200 text-orange-700 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2">
            SIAPKAN LOGISTIK PANEN <ChevronRight size={16} />
          </button>
        </div>

        {/* BOX 2 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RUANG 2</p>
              <h4 className="text-xl font-black text-gray-800">BOX #2</h4>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-gray-600 uppercase">TAHAP SIKLUS</span>
              <span className="text-sm font-black text-mag-green">55%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-mag-green rounded-full" style={{ width: '55%' }}></div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-gray-400"><TrendingUp size={14} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status Mikroklimat</p>
                <p className="text-xs font-medium text-gray-700">Suhu: 29.5°C, RH 72%, Media 60%</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-gray-400"><Package size={14} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Analisis Visual</p>
                <p className="text-xs font-medium text-gray-700">120 Larva Dewasa, 0 Prepupa</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] text-center p-5 rounded-xl shadow-inner mt-auto">
            <p className="text-[10px] font-bold text-mag-green uppercase tracking-wider mb-2">PREDIKSI PANEN</p>
            <p className="text-lg font-black text-white mb-2">04 Mei 2026</p>
            <p className="text-2xl font-black text-mag-green flex items-center justify-center gap-1">12 <span className="text-sm font-medium text-gray-400">Hari Lagi</span></p>
          </div>
        </div>

        {/* BOX 1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RUANG 1</p>
              <h4 className="text-xl font-black text-gray-800">BOX #1</h4>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-bold text-gray-600 uppercase">TAHAP SIKLUS</span>
              <span className="text-sm font-black text-mag-green">10%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-mag-green rounded-full" style={{ width: '10%' }}></div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-gray-400"><TrendingUp size={14} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status Mikroklimat</p>
                <p className="text-xs font-medium text-gray-700">Suhu: 28.2°C, RH 68%, Media 55%</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-gray-400"><Package size={14} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Analisis Visual</p>
                <p className="text-xs font-medium text-gray-700">Ribuan Telur/Penetasan, 15 Baby Larva</p>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] text-center p-5 rounded-xl shadow-inner mt-auto">
            <p className="text-[10px] font-bold text-mag-green uppercase tracking-wider mb-2">PREDIKSI PANEN</p>
            <p className="text-lg font-black text-white mb-2">16 Mei 2026</p>
            <p className="text-2xl font-black text-mag-green flex items-center justify-center gap-1">24 <span className="text-sm font-medium text-gray-400">Hari Lagi</span></p>
          </div>
        </div>

      </div>
    </div>
  );
}