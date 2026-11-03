import React from "react";
import { TrendingUp, Package, Timer, AlertTriangle, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import useBoxOverview from "../hooks/useBoxOverview";
import BoxCardGrid from "../components/BoxCardGrid";

const formatDate = (days) => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + Math.round(days));
  return targetDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

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

export default function Prediction() {
  const { cards, isLoading } = useBoxOverview({
    includePrediction: true,
    includeCv: true,
    pollMs: 10000
  });

  const primaryCard = cards.find((card) => card.number === 1) || cards[0] || null;
  const primarySource = primaryCard?.predictionSource || "-";

  const bestPrediction = cards.reduce((best, card) => {
    if (card.days === null) return best;
    if (best === null || card.days < best.days) return card;
    return best;
  }, null);

  const chartData = cards
    .filter((card) => card.days !== null)
    .map((card) => ({
      name: `Box #${card.number}`,
      boxName: card.name,
      number: card.number,
      days: Math.round(card.days),
      rawDays: card.days
    }))
    .sort((a, b) => a.days - b.days);

  const singlePrediction = chartData.length === 1 ? chartData[0] : null;
  const singleProgress = singlePrediction
    ? Math.max(0, Math.min(100, Math.round((1 - singlePrediction.rawDays / 18) * 100)))
    : 0;
  const chartHeight = Math.max(180, chartData.length * 56);

  return (
    <div className="space-y-6 pb-10">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-mag-green to-emerald-500 text-white p-6 rounded-3xl shadow-soft flex flex-col justify-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-green-100">METODE REGRESI</p>
              <p className="text-3xl font-black">XGBoost</p>
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
              <p className="text-2xl font-black text-slate-800 uppercase">{primarySource}</p>
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
              <p className="text-3xl font-black text-slate-800">
                {bestPrediction ? bestPrediction.days.toFixed(1) : "--"} <span className="text-sm font-bold text-slate-400">Hari</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3">
          <span className="w-2 h-6 bg-mag-green rounded-full inline-block shadow-glow"></span>
          {chartData.length > 1 ? "Perbandingan Estimasi Panen per Box" : "Estimasi Panen"}
        </h3>

        {singlePrediction ? (
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-8 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              {singlePrediction.name} • {singlePrediction.boxName}
            </p>
            <p className="text-6xl font-black text-slate-800">
              {singlePrediction.rawDays.toFixed(1)}
              <span className="text-lg font-bold text-slate-400"> Hari</span>
            </p>
            <p className="mt-2 text-sm font-bold text-mag-green">Estimasi panen {formatDate(singlePrediction.rawDays)}</p>
            <div className="mx-auto mt-6 max-w-md">
              <div className="mb-2 flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                <span>Tahap Siklus</span>
                <span className="text-mag-green">{singleProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100 shadow-inner">
                <div className="h-full rounded-full bg-gradient-to-r from-mag-green to-emerald-400 shadow-glow" style={{ width: `${singleProgress}%` }}></div>
              </div>
            </div>
          </div>
        ) : chartData.length > 1 ? (
          <div className="w-full mt-4" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: "#475569", fontSize: 13, fontWeight: 700}} width={80} />
                <Tooltip cursor={{fill: "#f8fafc"}} content={<CustomTooltip />} />
                <Bar dataKey="days" radius={[0, 10, 10, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.days <= 7 ? "#f97316" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm font-bold text-slate-400">
            {isLoading ? "Memuat data prediksi..." : "Belum ada data prediksi panen untuk ditampilkan."}
          </div>
        )}
        <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mt-4">* Estimasi dihitung dari data prediksi terbaru tiap Box</p>
      </div>

      {cards.length > 0 ? (
        <BoxCardGrid count={cards.length}>
          {cards.map(card => {
            const isPrimary = card === primaryCard;
            const cycleProgress = card.days !== null
              ? Math.max(0, Math.min(100, Math.round((1 - card.days / 18) * 100)))
              : 0;
            const phase = card.dominantPhase || "-";

            return (
              <div
                key={card.uuid || card.number}
                className={`rounded-3xl shadow-soft overflow-hidden flex flex-col p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  isPrimary
                    ? "bg-gradient-to-br from-emerald-50 to-green-50/50 border-2 border-emerald-200/60 hover:border-emerald-300"
                    : "bg-white/90 backdrop-blur-sm border border-white/50"
                }`}
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isPrimary ? "text-mag-green" : "text-slate-400"}`}>
                      {isPrimary ? "UNIT UTAMA" : card.name}
                    </p>
                    <h4 className="text-2xl font-black text-slate-800">BOX #{card.number}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {isPrimary && (
                      <span className="rounded-full bg-mag-green/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-mag-green">
                        Utama
                      </span>
                    )}
                    {card.days !== null && card.days <= 7 && <AlertTriangle className="text-orange-400 animate-pulse" size={28} />}
                  </div>
                </div>

                <div className={`mb-6 p-4 rounded-2xl border ${isPrimary ? "bg-white/70 border-emerald-100" : "bg-slate-50 border-slate-100"}`}>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wider">TAHAP SIKLUS</span>
                    <span className="text-sm font-black text-mag-green">{card.days !== null ? `${cycleProgress}%` : "--"}</span>
                  </div>
                  <div className={`h-2 w-full rounded-full overflow-hidden shadow-inner ${isPrimary ? "bg-emerald-100" : "bg-emerald-50"}`}>
                    <div className="h-full bg-gradient-to-r from-mag-green to-emerald-400 rounded-full shadow-glow" style={{ width: `${cycleProgress}%` }}></div>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-slate-400"><TrendingUp size={16} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status Mikroklimat</p>
                      <p className="text-sm font-bold text-slate-700">
                        Suhu: {card.temp ?? "--"}°C, RH {card.humidity ?? "--"}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-slate-400"><Package size={16} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Analisis Visual CV</p>
                      <p className="text-sm font-bold text-slate-700">
                        {card.hasCv ? `${card.totalDetected} objek • ${phase}` : "Belum ada data CV"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 text-center p-6 rounded-2xl shadow-soft mt-auto relative overflow-hidden">
                  {isPrimary && (
                    <div className="absolute -top-10 -left-10 text-slate-800 opacity-50 transform -rotate-12"><Timer size={120} /></div>
                  )}
                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-mag-green uppercase tracking-wider mb-2">PREDIKSI PANEN</p>
                    <p className="text-xl font-bold text-white mb-2">{card.days !== null ? formatDate(card.days) : "--"}</p>
                    <p className="text-3xl font-black text-mag-green flex items-center justify-center gap-2">
                      {card.days !== null ? card.days.toFixed(1) : "--"} <span className="text-sm font-bold text-slate-400">Hari Lagi</span>
                    </p>
                    {card.urgency && (
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">Urgensi: {card.urgency}</p>
                    )}
                  </div>
                </div>

                {isPrimary && (
                  <button className="w-full mt-5 py-3.5 bg-gradient-to-r from-mag-green to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-glow font-black text-xs uppercase tracking-wider rounded-xl transition-all hover:shadow-lg flex items-center justify-center gap-2 hover:-translate-y-0.5">
                    SIAPKAN LOGISTIK PANEN <ChevronRight size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </BoxCardGrid>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 text-center">
          <p className="text-sm font-bold text-slate-400">
            {isLoading ? "Memuat data Box..." : "Belum ada Box aktif yang terdaftar."}
          </p>
        </div>
      )}
    </div>
  );
}
