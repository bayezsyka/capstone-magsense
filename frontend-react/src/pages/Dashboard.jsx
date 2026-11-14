import React from 'react';
import useWebSocket from '../hooks/useWebSocket';
import useBoxOverview from '../hooks/useBoxOverview';
import { useGlobalContext } from '../context/useGlobalContext';
import { Activity, Zap, Wind, Droplets, Thermometer, Sprout, Box as BoxIcon, Radio } from 'lucide-react';
import SkeletonCard from '../components/SkeletonCard';
import ErrorBoundary from '../components/ErrorBoundary';
import BoxCardGrid from '../components/BoxCardGrid';

const Dashboard = () => {
  const { user } = useGlobalContext();
  const { isConnected } = useWebSocket();
  const { cards, summary, isLoading } = useBoxOverview({
    includeSensorData: true,
    includePrediction: true,
    includeCv: true,
    pollMs: 10000
  });

  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  const primaryCard = cards.find((card) => card.number === 1) || cards[0] || null;
  const actuators = isAdmin ? (summary?.currentBox?.actuators || {}) : {};
  const summaryDays = parseFloat(summary?.harvestPrediction?.estimatedDays);
  const estimatedDays = primaryCard?.days ?? (Number.isFinite(summaryDays) ? summaryDays : null);

  const airTemp = primaryCard?.temp ?? '--';
  const airHumidity = primaryCard?.humidity ?? '--';
  const mediaHumidity = primaryCard?.mediaHumidity ?? '--';
  const currentNumber = primaryCard?.number ?? '--';
  const phase = primaryCard?.dominantPhase
    || summary?.cvAnalysis?.dominantPhase
    || '--';
  const urgency = primaryCard?.urgency || summary?.harvestPrediction?.urgencyLevel || null;
  const lastUpdated = primaryCard?.timestamp
    ? new Date(primaryCard.timestamp).toLocaleTimeString('id-ID')
    : '--';

  return (
    <ErrorBoundary>
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="text-mag-green" size={24} />
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Ringkasan Dasbor</h2>
      </div>

      {isLoading ? (
        <BoxCardGrid count={3} className="mb-8">
          <SkeletonCard count={3} />
        </BoxCardGrid>
      ) : cards.length > 0 ? (
        <BoxCardGrid count={cards.length} className="mb-8">
          {cards.map((box) => {
            const hasReading = box.temp !== '--' || box.humidity !== '--';

            return (
              <div
                key={box.uuid || box.number}
                className="group relative overflow-hidden flex flex-col h-full rounded-3xl border border-white/60 bg-white/90 p-6 shadow-soft backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-mag-green via-emerald-400 to-lime-300 opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="mb-6 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Box Unit</p>
                    <h3 className="truncate text-lg font-black text-slate-800">{box.name}</h3>
                  </div>
                  <span className="shrink-0 rounded-2xl bg-mag-green/10 px-3 py-1.5 text-sm font-black text-mag-green">
                    #{box.number}
                  </span>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-500">
                      <Wind size={16} className="mr-2" />
                      <span className="text-sm">Suhu</span>
                    </div>
                    <span className="font-semibold text-gray-800">{box.temp}°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-500">
                      <Droplets size={16} className="mr-2" />
                      <span className="text-sm">Kelembapan</span>
                    </div>
                    <span className="font-semibold text-gray-800">{box.humidity}%</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Radio size={12} className="shrink-0" />
                    <span className="truncate">{box.source || 'Menunggu data'}</span>
                  </span>
                  <span className={`ml-3 h-2.5 w-2.5 shrink-0 rounded-full ${hasReading ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
              </div>
            );
          })}
        </BoxCardGrid>
      ) : (
        <div className="mb-8 rounded-3xl border border-white/50 bg-white/90 p-8 text-center shadow-soft backdrop-blur-sm">
          <BoxIcon className="mx-auto mb-3 text-slate-300" size={32} />
          <p className="text-sm font-bold text-slate-400">Belum ada Box aktif yang terdaftar.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-soft border border-white/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <Zap className="text-orange-400" size={20} />
              <h3 className="font-bold text-gray-800 tracking-wide uppercase text-sm">
                Status Langsung{primaryCard ? ` Box #${currentNumber}` : ''}
              </h3>
            </div>
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} transition-colors`}></div>
              <span className="text-xs font-bold text-mag-green">{isConnected ? 'SISTEM AKTIF' : 'TERPUTUS'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50/50 border border-emerald-100/50 rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-md">
              <p className="text-xs font-black text-mag-green uppercase tracking-wider mb-2">Suhu Udara</p>
              <p className="text-4xl font-bold text-slate-800">{airTemp}<span className="text-xl text-slate-400 font-medium">°C</span></p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-sky-50/50 border border-blue-100/50 rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-md">
              <p className="text-xs font-black text-blue-500 uppercase tracking-wider mb-2">Hum. Udara</p>
              <p className="text-4xl font-bold text-slate-800">{airHumidity}<span className="text-xl text-slate-400 font-medium">%</span></p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-orange-100/50 rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-md">
              <p className="text-xs font-black text-amber-500 uppercase tracking-wider mb-2">Hum. Media</p>
              <p className="text-4xl font-bold text-slate-800">{mediaHumidity}<span className="text-xl text-slate-400 font-medium">%</span></p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Status Aktuator</h4>
            {Object.keys(actuators).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(actuators).map(([key, value]) => (
                  <div key={key} className={`border rounded-xl p-4 flex flex-col items-center justify-center transition-all duration-300 ${value === 'ON' ? 'bg-mag-green/10 border-mag-green/30' : 'bg-gray-50 border-gray-100'}`}>
                    {key === 'heater' && <Thermometer size={24} className={`mb-2 ${value === 'ON' ? 'text-mag-green' : 'text-gray-300'}`} />}
                    {key === 'kipas' && <Wind size={24} className={`mb-2 ${value === 'ON' ? 'text-blue-500' : 'text-gray-300'}`} />}
                    {key === 'pompa' && <Droplets size={24} className={`mb-2 ${value === 'ON' ? 'text-blue-400' : 'text-gray-300'}`} />}
                    <p className={`text-xs font-bold uppercase tracking-wider transition-colors ${value === 'ON' ? 'text-gray-800' : 'text-gray-400'}`}>{key === 'heater' ? 'Pemanas' : key}</p>
                    <p className={`text-[10px] mt-1 font-bold transition-colors ${value === 'ON' ? 'text-mag-green' : 'text-gray-300'}`}>{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-xs font-bold text-slate-400">
                Belum ada data aktuator untuk box ini.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="absolute -top-10 -right-10 p-4 opacity-10 transform rotate-12">
              <Sprout size={160} />
            </div>
            <h3 className="text-xs font-bold text-mag-green tracking-wider uppercase mb-6">Prediksi Panen Terdekat</h3>
            <div className="flex items-end mb-4">
              <span className="text-6xl font-bold mr-2">{Number.isFinite(estimatedDays) ? Math.round(estimatedDays) : '--'}</span>
              <span className="text-lg text-gray-300 mb-1">Hari Lagi</span>
            </div>
            <div className="bg-white/10 rounded-xl p-3 flex items-center mb-4 border border-white/5">
              <div className="bg-mag-green rounded-lg p-2 mr-3">
                <Activity size={16} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Fase Saat Ini</p>
                <p className="text-sm font-semibold">{phase}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-3 py-2 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Urgensi</span>
              <span className="text-xs font-bold text-mag-green">{urgency || '--'}</span>
            </div>
            <p className="text-[10px] text-gray-400 italic">*Estimasi berdasarkan Computer Vision & ML</p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-soft border border-white/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase mb-4">Informasi Sistem</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-sm text-gray-500">Status WebSocket</span>
                <span className={`text-sm font-semibold ${isConnected ? 'text-mag-green' : 'text-red-500'}`}>
                  {isConnected ? 'Terhubung' : 'Terputus'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-sm text-gray-500">Terakhir Sinkron</span>
                <span className="text-sm font-semibold text-slate-700">{lastUpdated}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Database API</span>
                <span className="text-sm font-semibold text-mag-green">Terhubung</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
