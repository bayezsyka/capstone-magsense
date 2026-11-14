import React, { useEffect, useState } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import useBoxOverview from '../hooks/useBoxOverview';
import { useGlobalContext } from '../context/useGlobalContext';
import { getSensorHistory } from '../services/api';
import { Package, ThermometerSun, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SkeletonCard from '../components/SkeletonCard';
import Spinner from '../components/Spinner';
import ErrorBoundary from '../components/ErrorBoundary';
import BoxCardGrid from '../components/BoxCardGrid';

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '--';
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(1) : '--';
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const ACTUATOR_LABELS = {
  heater: 'Heater',
  kipas: 'Kipas Exhaust',
  pompa: 'Solenoid Valve'
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl text-xs font-bold">
        <p className="text-gray-500 mb-2">{label} WIB</p>
        <p className="text-blue-500">Kelembapan: {formatValue(payload[0]?.value)}%</p>
        <p className="text-mag-green mt-1">Suhu: {formatValue(payload[1]?.value)}°C</p>
      </div>
    );
  }
  return null;
};

export default function Monitoring() {
  const { user } = useGlobalContext();
  const { isConnected } = useWebSocket();
  const { cards, summary, isLoading, error } = useBoxOverview({
    includeSensorData: true,
    pollMs: 10000
  });

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);

  const primaryCard = cards.find((card) => card.number === 1) || cards[0] || null;
  const primaryBoxId = primaryCard?.uuid;

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async ({ silent = false } = {}) => {
      if (!primaryBoxId) {
        if (isMounted) {
          setChartData([]);
          setChartLoading(false);
        }
        return;
      }

      if (!silent && isMounted) setChartLoading(true);

      try {
        const history = await getSensorHistory(primaryBoxId, 24).catch(() => []);
        if (!isMounted) return;

        const mappedHistory = (Array.isArray(history) ? history : [])
          .slice(0, 96)
          .reverse()
          .map((row) => {
            const temp = Number(row.air_temp);
            const humidity = Number(row.air_humidity);
            return {
              time: formatTime(row.timestamp),
              temp: Number.isFinite(temp) ? temp : null,
              humidity: Number.isFinite(humidity) ? humidity : null
            };
          })
          .filter((row) => row.temp !== null || row.humidity !== null);

        setChartData(mappedHistory);
      } finally {
        if (isMounted) setChartLoading(false);
      }
    };

    fetchHistory();
    const interval = setInterval(() => fetchHistory({ silent: true }), 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [primaryBoxId]);

  const actuatorState = isAdmin ? (summary?.currentBox?.actuators || {}) : {};
  const activeActuators = Object.entries(actuatorState)
    .filter(([, status]) => String(status).toUpperCase() === 'ON')
    .map(([key]) => ACTUATOR_LABELS[key] || key);

  const numericTemps = cards
    .map((box) => Number(box.temp))
    .filter((value) => Number.isFinite(value));
  const averageTemp = numericTemps.length > 0
    ? (numericTemps.reduce((sum, value) => sum + value, 0) / numericTemps.length).toFixed(1)
    : '--';

  const getActuatorLabel = (box) => {
    if (!isAdmin || !primaryCard || box.number !== primaryCard.number) return 'Belum tersedia';
    return activeActuators.length > 0 ? activeActuators.join(', ') : 'Standby Mode';
  };

  return (
    <ErrorBoundary>
      <div className="space-y-6 pb-10">

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 px-5 py-4 rounded-2xl text-sm font-bold">
          {error?.message || 'Gagal memuat data monitoring'}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 flex items-center gap-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center text-mag-green shadow-inner">
            <Package size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">TOTAL BOX</p>
            <p className="text-3xl font-black text-slate-800">{cards.length} <span className="text-sm font-bold text-slate-400">Unit</span></p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 flex items-center gap-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center text-blue-500 shadow-inner">
            <ThermometerSun size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">RERATA SUHU</p>
            <p className="text-3xl font-black text-slate-800">{averageTemp} <span className="text-sm font-bold text-slate-400">°C</span></p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 flex items-center gap-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center text-orange-400 shadow-inner">
            <Zap size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">AKTUATOR AKTIF</p>
            <p className="text-3xl font-black text-slate-800">{activeActuators.length} <span className="text-sm font-bold text-slate-400">Perangkat</span></p>
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold text-slate-800">
            Tren Mikroklimat{primaryCard ? ` Box #${primaryCard.number}` : ''}
          </h3>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${isConnected ? 'bg-emerald-50 text-mag-green' : 'bg-red-50 text-red-500'}`}>
            {isConnected ? 'LIVE MONITORING' : 'OFFLINE'}
          </span>
        </div>
        <p className="text-sm font-medium text-slate-400 mb-8">
          {primaryCard ? `${primaryCard.name} • suhu dan kelembapan 24 jam terakhir` : 'Visualisasi suhu dan kelembapan 24 jam terakhir'}
        </p>

        {isLoading || chartLoading ? (
          <Spinner size="lg" text="Memuat Data Grafik..." />
        ) : chartData.length > 0 ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} minTickGap={24} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={4} dot={false} connectNulls activeDot={{r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2}} />
                <Line type="monotone" dataKey="temp" stroke="#10b981" strokeWidth={4} dot={false} connectNulls activeDot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-sm font-bold text-slate-400">
            Belum ada data sensor pada 24 jam terakhir.
          </div>
        )}
      </div>

      {isLoading ? (
        <BoxCardGrid count={3}>
          <SkeletonCard count={3} />
        </BoxCardGrid>
      ) : cards.length > 0 ? (
        <BoxCardGrid count={cards.length}>
          {cards.map((box) => {
            const isHot = Number(box.temp) > 30;
            const actuatorLabel = getActuatorLabel(box);
            const isStandby = actuatorLabel.includes('Standby') || actuatorLabel.includes('Belum');

            return (
              <div key={box.uuid || box.number} className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-soft border border-white/50 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative group">
                {isHot && <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-400 to-amber-300"></div>}
                <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-white/50">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-[10px] font-black text-slate-400 tracking-wider">BOX #{box.number}</span>
                    <span className="text-slate-300">|</span>
                    <span className="truncate text-sm font-black text-slate-700 tracking-wider">{box.name}</span>
                  </div>
                  {isHot && <div className="text-orange-400 animate-pulse"><Zap size={20} /></div>}
                </div>
                <div className="p-6 space-y-5 flex-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-500 font-medium"><ThermometerSun size={18}/> Suhu Udara</span>
                    <span className={`text-lg font-bold transition-colors ${isHot ? 'text-orange-500' : 'text-slate-800'}`}>{box.temp} °C</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-500 font-medium"><Package size={18}/> Kelembapan Udara</span>
                    <span className="text-lg font-bold text-slate-800 transition-colors">{box.humidity} %</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2 text-slate-500 font-medium"><Package size={18}/> Kelembapan Media</span>
                    <span className="text-lg font-bold text-slate-800 transition-colors">{box.mediaHumidity} %</span>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-2">
                  <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase mb-3">Status Aktuator</p>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                    isStandby ? 'bg-slate-50 text-slate-500 border border-slate-100' : 'bg-gradient-to-r from-mag-green to-emerald-400 text-white shadow-glow'
                  }`}>
                    {isStandby ? <div className="w-2 h-2 rounded-full bg-slate-300"></div> : <Zap size={14} />}
                    {actuatorLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </BoxCardGrid>
      ) : (
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 text-center">
          <p className="text-sm font-bold text-slate-400">Belum ada Box aktif yang terdaftar.</p>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}
