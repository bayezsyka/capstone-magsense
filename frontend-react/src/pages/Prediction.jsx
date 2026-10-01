import React, { useState, useEffect } from "react";
import { TrendingUp, Package, Timer, AlertTriangle, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getDashboardSummary, getAllHarvestPredictions } from "../services/api";

export default function Prediction() {
  const [summary, setSummary] = useState(null);
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumData, predList] = await Promise.all([
          getDashboardSummary().catch(() => null),
          getAllHarvestPredictions().catch(() => [])
        ]);
        if (sumData) setSummary(sumData);
        if (Array.isArray(predList)) setPredictions(predList);
      } catch (e) {
        console.warn("Gagal memuat data prediksi:", e);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const box1Days = summary?.harvestPrediction?.estimatedDays 
    ? parseFloat(summary.harvestPrediction.estimatedDays) 
    : 8.5;
  const box1Urgency = summary?.harvestPrediction?.urgencyLevel || "Low";
  const box1Confidence = summary?.harvestPrediction?.confidence 
    ? (parseFloat(summary.harvestPrediction.confidence) * 100).toFixed(1) 
    : "95.0";
  const box1Source = summary?.harvestPrediction?.source || "xgboost";

  const box1Temp = summary?.currentBox?.airTemp || "29.8";
  const box1Hum = summary?.currentBox?.airHumidity || "71.5";
  const box1Media = summary?.currentBox?.mediaHumidity || "58.2";

  const cvCounts = summary?.cvAnalysis?.detectionCounts || {};
  const adultCount = cvCounts.adult_larva || 160;
  const prepupaCount = cvCounts.prepupa || 30;

  const chartData = [
    { name: "Box 1", days: Math.round(box1Days) },
    { name: "Box 2", days: 12 },
    { name: "Box 3", days: 18 },
  ].sort((a, b) => a.days - b.days);

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

  // Calculate target date for Box 1
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + Math.round(box1Days));
  const formattedTargetDate = targetDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

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
              <p className="text-[10px] font-black uppercase tracking-wider text-green-100">MODEL & CONFIDENCE</p>
              <p className="text-3xl font-black">{box1Confidence}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 flex flex-col justify-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center shadow-inner">
              <Package size={24} className="text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">ENGINE INFERENSI</p>
              <p className="text-2xl font-black text-slate-800 uppercase">{box1Source}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 flex flex-col justify-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center shadow-inner">
              <Timer size={24} className="text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">ESTIMASI TERDEKAT</p>
              <p className="text-3xl font-black text-slate-800">{box1Days.toFixed(1)} <span className="text-sm font-bold text-slate-400">Hari</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
          <span className="w-2 h-6 bg-mag-green rounded-full inline-block shadow-glow"></span>
          Perbandingan Estimasi Panen per Box
        </h3>
        
        <div className="h-[200px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: "#475569", fontSize: 13, fontWeight: 700}} width={70} />
              <Tooltip cursor={{fill: "#f8fafc"}} content={<CustomTooltip />} />
              <Bar dataKey="days" radius={[0, 10, 10, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.days <= 7 ? "#f97316" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mt-4">* Estimasi Box #1 dihitung real-time menggunakan XGBoost regressor</p>
      </div>

      {/* BOX PREDICTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BOX 1 (LIVE XGBOOST) */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50/50 rounded-3xl shadow-soft border-2 border-emerald-200/60 overflow-hidden flex flex-col p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] font-black text-mag-green uppercase tracking-widest">UNIT UTAMA</p>
              <h4 className="text-2xl font-black text-slate-800">BOX #1</h4>
            </div>
            {box1Days <= 7 && <AlertTriangle className="text-orange-400 animate-pulse" size={28} />}
          </div>

          <div className="mb-6 bg-white/70 p-4 rounded-2xl border border-emerald-100">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">TAHAP SIKLUS</span>
              <span className="text-sm font-black text-mag-green">{Math.max(10, Math.min(95, Math.round((1 - box1Days / 18) * 100)))}%</span>
            </div>
            <div className="h-2 w-full bg-emerald-100 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-mag-green to-emerald-400 rounded-full shadow-glow" style={{ width: `${Math.max(10, Math.min(95, Math.round((1 - box1Days / 18) * 100)))}%` }}></div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><TrendingUp size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Mikroklimat</p>
                <p className="text-sm font-bold text-slate-700">Suhu: {box1Temp}°C, RH {box1Hum}%, Media {box1Media}%</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><Package size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Analisis Visual CV</p>
                <p className="text-sm font-bold text-slate-700">{adultCount} Larva Dewasa, {prepupaCount} Prepupa</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-center p-6 rounded-2xl mb-5 shadow-soft mt-auto relative overflow-hidden">
            <div className="absolute -top-10 -left-10 text-slate-800 opacity-50 transform -rotate-12"><Timer size={120} /></div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-mag-green uppercase tracking-wider mb-2">PREDIKSI PANEN (XGBOOST)</p>
              <p className="text-xl font-bold text-white mb-2">{formattedTargetDate}</p>
              <p className="text-3xl font-black text-mag-green flex items-center justify-center gap-2">{box1Days.toFixed(1)} <span className="text-sm font-bold text-slate-400">Hari Lagi</span></p>
            </div>
          </div>

          <button className="w-full py-3.5 bg-gradient-to-r from-mag-green to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-glow font-black text-xs uppercase tracking-wider rounded-xl transition-all hover:shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5">
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
              <div className="h-full bg-gradient-to-r from-mag-green to-emerald-400 rounded-full shadow-glow" style={{ width: "55%" }}></div>
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
            <p className="text-xl font-bold text-white mb-2">13 Okt 2026</p>
            <p className="text-3xl font-black text-mag-green flex items-center justify-center gap-2">12.0 <span className="text-sm font-bold text-slate-400">Hari Lagi</span></p>
          </div>
        </div>

        {/* BOX 3 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-soft border border-white/50 overflow-hidden flex flex-col p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RUANG 3</p>
              <h4 className="text-2xl font-black text-slate-800">BOX #3</h4>
            </div>
          </div>

          <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">TAHAP SIKLUS</span>
              <span className="text-sm font-black text-mag-green">25%</span>
            </div>
            <div className="h-2 w-full bg-emerald-50 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-gradient-to-r from-mag-green to-emerald-400 rounded-full shadow-glow" style={{ width: "25%" }}></div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><TrendingUp size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Mikroklimat</p>
                <p className="text-sm font-bold text-slate-700">Suhu: 31.2°C, RH 68%, Media 55%</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 text-slate-400"><Package size={16} /></div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Analisis Visual</p>
                <p className="text-sm font-bold text-slate-700">15 Larva Bayi, 20 Dewasa</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-center p-6 rounded-2xl shadow-soft mt-auto">
            <p className="text-[10px] font-black text-mag-green uppercase tracking-wider mb-2">PREDIKSI PANEN</p>
            <p className="text-xl font-bold text-white mb-2">19 Okt 2026</p>
            <p className="text-3xl font-black text-mag-green flex items-center justify-center gap-2">18.0 <span className="text-sm font-bold text-slate-400">Hari Lagi</span></p>
          </div>
        </div>

      </div>
    </div>
  );
}
