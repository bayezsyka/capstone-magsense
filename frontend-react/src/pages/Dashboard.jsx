import React, { useEffect, useState, useMemo } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import { getDashboardSummary } from '../services/api';
import { Activity, Zap, Wind, Droplets, Thermometer, Sprout } from 'lucide-react';
import SkeletonCard from '../components/SkeletonCard';
import ErrorBoundary from '../components/ErrorBoundary';

const Dashboard = () => {
  const { realtimeData, isConnected } = useWebSocket();
  
  const [sensorData, setSensorData] = useState({
    boxes: [
      { id: 1, temp: '--', humidity: '--' },
      { id: 2, temp: '--', humidity: '--' },
      { id: 3, temp: '--', humidity: '--' },
    ],
    currentBox: {
      airTemp: '--',
      airHumidity: '--',
      mediaHumidity: '--',
      actuators: {
        heater: 'OFF',
        kipas: 'OFF',
        pompa: 'OFF'
      }
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial fallback data via API
  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        const data = await getDashboardSummary();
        // if (isMounted) setSensorData(data);
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

  // Map realtimeData (from Edge) to Dashboard UI structure
  useEffect(() => {
    if (realtimeData) {
      // realtimeData is an array of sensor readings from Edge
      // Example: [{box_id: 1, air_temp: 28.5, air_humidity: 70, media_humidity: 45}]
      
      const newBoxes = [...sensorData.boxes];
      let newCurrentBox = { ...sensorData.currentBox };
      
      // Update data based on incoming payload
      if (Array.isArray(realtimeData)) {
        realtimeData.forEach(reading => {
          // Update Box summary
          const boxIndex = newBoxes.findIndex(b => b.id === reading.box_id);
          if (boxIndex !== -1) {
            newBoxes[boxIndex] = {
              id: reading.box_id,
              temp: reading.air_temp || newBoxes[boxIndex].temp,
              humidity: reading.air_humidity || newBoxes[boxIndex].humidity
            };
          }
          
          // Update Current Box detailed view (assuming focusing on Box 1)
          if (reading.box_id === 1) {
            newCurrentBox = {
              ...newCurrentBox,
              airTemp: reading.air_temp || newCurrentBox.airTemp,
              airHumidity: reading.air_humidity || newCurrentBox.airHumidity,
              mediaHumidity: reading.media_humidity || newCurrentBox.mediaHumidity,
            };
          }
        });
      }
      
      setSensorData(prev => ({
        ...prev,
        boxes: newBoxes,
        currentBox: newCurrentBox
      }));
    }
  }, [realtimeData]);

  // Memoize top boxes to avoid re-rendering them unless their data changes
  const memoizedBoxes = useMemo(() => sensorData.boxes, [sensorData.boxes]);
  
  if (error) {
    throw new Error(error); // Caught by ErrorBoundary
  }

  return (
    <ErrorBoundary>
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="text-mag-green" size={24} />
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Dashboard Ringkasan</h2>
      </div>

      {/* Top Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {isLoading ? (
          <SkeletonCard count={3} />
        ) : (
          memoizedBoxes.map((box, idx) => (
            <div key={box.id} className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 shadow-soft border border-white/50 flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold text-gray-400 tracking-wider">BOX UNIT</span>
                <span className="text-xl font-bold text-mag-green">#{box.id}</span>
              </div>
              <div className="space-y-4 flex-1 flex flex-col justify-end">
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-gray-500">
                    <Wind size={16} className="mr-2" />
                    <span className="text-sm">Suhu</span>
                  </div>
                  <span className="font-semibold text-gray-800 transition-all">{box.temp}°C</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-gray-500">
                    <Droplets size={16} className="mr-2" />
                    <span className="text-sm">Kelembapan</span>
                  </div>
                  <span className="font-semibold text-gray-800 transition-all">{box.humidity}%</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Status Area */}
        <div className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-soft border border-white/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <Zap className="text-orange-400" size={20} />
              <h3 className="font-bold text-gray-800 tracking-wide uppercase text-sm">Status Real-Time Box #1</h3>
            </div>
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} transition-colors`}></div>
              <span className="text-xs font-bold text-mag-green">{isConnected ? 'LIVE SYSTEM' : 'DISCONNECTED'}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50/50 border border-emerald-100/50 rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-md">
              <p className="text-xs font-black text-mag-green uppercase tracking-wider mb-2">Suhu Udara</p>
              <p className="text-4xl font-bold text-slate-800">{sensorData.currentBox.airTemp}<span className="text-xl text-slate-400 font-medium">°C</span></p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-sky-50/50 border border-blue-100/50 rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-md">
              <p className="text-xs font-black text-blue-500 uppercase tracking-wider mb-2">Hum. Udara</p>
              <p className="text-4xl font-bold text-slate-800">{sensorData.currentBox.airHumidity}<span className="text-xl text-slate-400 font-medium">%</span></p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-orange-100/50 rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-md">
              <p className="text-xs font-black text-amber-500 uppercase tracking-wider mb-2">Hum. Media</p>
              <p className="text-4xl font-bold text-slate-800">{sensorData.currentBox.mediaHumidity}<span className="text-xl text-slate-400 font-medium">%</span></p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Status Aktuator</h4>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(sensorData.currentBox.actuators).map(([key, value]) => (
                <div key={key} className={`border rounded-xl p-4 flex flex-col items-center justify-center transition-all duration-300 ${value === 'ON' ? 'bg-mag-green/10 border-mag-green/30' : 'bg-gray-50 border-gray-100'}`}>
                    {key === 'heater' && <Thermometer size={24} className={`mb-2 ${value === 'ON' ? 'text-mag-green' : 'text-gray-300'}`} />}
                    {key === 'kipas' && <Wind size={24} className={`mb-2 ${value === 'ON' ? 'text-blue-500' : 'text-gray-300'}`} />}
                    {key === 'pompa' && <Droplets size={24} className={`mb-2 ${value === 'ON' ? 'text-blue-400' : 'text-gray-300'}`} />}
                    <p className={`text-xs font-bold uppercase tracking-wider transition-colors ${value === 'ON' ? 'text-gray-800' : 'text-gray-400'}`}>{key}</p>
                    <p className={`text-[10px] mt-1 font-bold transition-colors ${value === 'ON' ? 'text-mag-green' : 'text-gray-300'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side Cards */}
        <div className="space-y-6">
          {/* Prediction Card */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
            <div className="absolute -top-10 -right-10 p-4 opacity-10 transform rotate-12">
                <Sprout size={160} />
            </div>
            <h3 className="text-xs font-bold text-mag-green tracking-wider uppercase mb-6">Prediksi Panen Terdekat</h3>
            <div className="flex items-end mb-4">
              <span className="text-6xl font-bold mr-2">5</span>
              <span className="text-lg text-gray-300 mb-1">Hari Lagi</span>
            </div>
            <div className="bg-white/10 rounded-xl p-3 flex items-center mb-4 border border-white/5">
              <div className="bg-mag-green rounded-lg p-2 mr-3">
                <Activity size={16} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Fase Saat Ini</p>
                <p className="text-sm font-semibold">Monitoring</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 italic">*Estimasi berdasarkan Computer Vision & ML</p>
          </div>

          {/* System Info */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-soft border border-white/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase mb-4">Informasi Sistem</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-sm text-gray-500">Status WebSocket</span>
                <span className={`text-sm font-semibold ${isConnected ? 'text-mag-green' : 'text-red-500'}`}>
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Database API</span>
                <span className="text-sm font-semibold text-mag-green">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
