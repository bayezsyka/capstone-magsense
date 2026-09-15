import React, { useEffect, useState } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import { getSensorHistory } from '../services/api';
import { Package, ThermometerSun, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import SkeletonCard from '../components/SkeletonCard';
import Spinner from '../components/Spinner';
import ErrorBoundary from '../components/ErrorBoundary';

export default function Monitoring() {
  const { realtimeData, isConnected } = useWebSocket();
  
  const [chartData, setChartData] = useState([
    { time: '00:00', temp: 26, humidity: 75 },
    { time: '04:00', temp: 25, humidity: 78 },
    { time: '08:00', temp: 28, humidity: 72 },
    { time: '12:00', temp: 31, humidity: 62 },
    { time: '16:00', temp: 29, humidity: 68 },
    { time: '20:00', temp: 27, humidity: 74 }
  ]);
  
  const [boxStats, setBoxStats] = useState([
    { id: 1, airTemp: '28.5', airHumidity: '70.2', mediaHumidity: '45.0', actuator: 'Solenoid Valve #1' },
    { id: 2, airTemp: '32.5', airHumidity: '75.0', mediaHumidity: '62.0', actuator: 'Kipas Exhaust' },
    { id: 3, airTemp: '29.1', airHumidity: '68.5', mediaHumidity: '58.0', actuator: 'Standby Mode' }
  ]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial fallback data via API
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const history = await getSensorHistory();
        if (history && history.length > 0) {
           // map history to chartData if valid
        }
      } catch (err) {
        if (isMounted) setError(err.message);
        console.warn('Fallback to dummy data, API fetch failed:', err.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchInitialData();
    return () => { isMounted = false; };
  }, []);

  // Map realtimeData (from Edge) to Box Stats
  useEffect(() => {
    if (realtimeData) {
      if (Array.isArray(realtimeData)) {
        setBoxStats(prev => {
          const newStats = [...prev];
          realtimeData.forEach(reading => {
            const index = newStats.findIndex(b => b.id === reading.box_id);
            if (index !== -1) {
              newStats[index] = {
                ...newStats[index],
                airTemp: reading.air_temp || newStats[index].airTemp,
                airHumidity: reading.air_humidity || newStats[index].airHumidity,
                mediaHumidity: reading.media_humidity || newStats[index].mediaHumidity,
              };
            }
          });
          return newStats;
        });
      }
    }
  }, [realtimeData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl text-xs font-bold">
          <p className="text-gray-500 mb-2">{label} WIB</p>
          <p className="text-blue-500">Kelembapan: {payload[0].value}%</p>
          <p className="text-mag-green mt-1">Suhu: {payload[1].value}°C</p>
        </div>
      );
    }
    return null;
  };

  const memoizedBoxStats = React.useMemo(() => boxStats, [boxStats]);
  const memoizedChartData = React.useMemo(() => chartData, [chartData]);

  if (error) {
    throw new Error(error);
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6 pb-10">
      
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 flex items-center gap-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center text-mag-green shadow-inner">
            <Package size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">TOTAL BOX</p>
            <p className="text-3xl font-black text-slate-800">3 <span className="text-sm font-bold text-slate-400">Unit</span></p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 flex items-center gap-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-sky-100 flex items-center justify-center text-blue-500 shadow-inner">
            <ThermometerSun size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">RERATA SUHU</p>
            <p className="text-3xl font-black text-slate-800">30.0 <span className="text-sm font-bold text-slate-400">°C</span></p>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 flex items-center gap-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center text-orange-400 shadow-inner">
            <Zap size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">AKTUATOR AKTIF</p>
            <p className="text-3xl font-black text-slate-800">2 <span className="text-sm font-bold text-slate-400">Perangkat</span></p>
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-soft border border-white/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold text-slate-800">Tren Mikroklimat</h3>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider ${isConnected ? 'bg-emerald-50 text-mag-green' : 'bg-red-50 text-red-500'}`}>
            {isConnected ? 'LIVE MONITORING' : 'OFFLINE'}
          </span>
        </div>
        <p className="text-sm font-medium text-slate-400 mb-8">Visualisasi suhu dan kelembapan 24 jam terakhir</p>
        
        {isLoading ? (
          <Spinner size="lg" text="Memuat Data Grafik..." />
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={memoizedChartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={4} dot={false} activeDot={{r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2}} />
                <Line type="monotone" dataKey="temp" stroke="#10b981" strokeWidth={4} dot={false} activeDot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* BOX CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <SkeletonCard count={3} />
        ) : (
          memoizedBoxStats.map((box) => (
            <div key={box.id} className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-soft border border-white/50 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative group">
              {box.airTemp > 30 && <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-orange-400 to-amber-300"></div>}
              <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-white/50">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 tracking-wider">RUANG {box.id}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-sm font-black text-slate-700 tracking-wider">BOX #{box.id}</span>
                </div>
                {box.airTemp > 30 && <div className="text-orange-400 animate-pulse"><Zap size={20} /></div>}
              </div>
              <div className="p-6 space-y-5 flex-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-slate-500 font-medium"><ThermometerSun size={18}/> Suhu Udara</span>
                  <span className={`text-lg font-bold transition-colors ${box.airTemp > 30 ? 'text-orange-500' : 'text-slate-800'}`}>{box.airTemp} °C</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-slate-500 font-medium"><Package size={18}/> Kelembapan Udara</span>
                  <span className="text-lg font-bold text-slate-800 transition-colors">{box.airHumidity} %</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-slate-500 font-medium"><Package size={18}/> Kelembapan Media</span>
                  <span className="text-lg font-bold text-slate-800 transition-colors">{box.mediaHumidity} %</span>
                </div>
              </div>
              <div className="px-6 pb-6 pt-2">
                <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase mb-3">Status Aktuator</p>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                  box.actuator.includes('Standby') ? 'bg-slate-50 text-slate-500 border border-slate-100' : 'bg-gradient-to-r from-mag-green to-emerald-400 text-white shadow-glow'
                }`}>
                  {box.actuator.includes('Standby') ? <div className="w-2 h-2 rounded-full bg-slate-300"></div> : <Zap size={14} />}
                  {box.actuator}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
