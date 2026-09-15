import React, { useEffect, useState } from 'react';
import { socket } from '../services/socket';
import { Activity, Zap, Wind, Droplets, Thermometer, Sprout } from 'lucide-react';

const Dashboard = () => {
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
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket.connect();
    
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    
    socket.on('sensor-update', (data) => {
      setSensorData(data);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('sensor-update');
      socket.disconnect();
    };
  }, []);

  return (
    <>
      <div className="flex items-center space-x-2 mb-6">
        <Activity className="text-mag-green" size={24} />
        <h2 className="text-xl font-bold text-gray-800 uppercase tracking-wide">Dashboard Ringkasan</h2>
      </div>

      {/* Top Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {sensorData.boxes.map((box, idx) => (
          <div key={box.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
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
                <span className="font-semibold text-gray-800">{box.temp}°C</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center text-gray-500">
                  <Droplets size={16} className="mr-2" />
                  <span className="text-sm">Kelembapan</span>
                </div>
                <span className="font-semibold text-gray-800">{box.humidity}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Status Area */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-2">
              <Zap className="text-orange-400" size={20} />
              <h3 className="font-bold text-gray-800 tracking-wide uppercase text-sm">Status Real-Time Box #1</h3>
            </div>
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs font-bold text-mag-green">{isConnected ? 'LIVE SYSTEM' : 'DISCONNECTED'}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-green-50/50 border border-green-100 rounded-xl p-5 text-center">
              <p className="text-xs font-bold text-mag-green uppercase tracking-wider mb-2">Suhu Udara</p>
              <p className="text-3xl font-bold text-gray-800">{sensorData.currentBox.airTemp}<span className="text-lg text-gray-500 font-normal">°C</span></p>
            </div>
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 text-center">
              <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">Hum. Udara</p>
              <p className="text-3xl font-bold text-gray-800">{sensorData.currentBox.airHumidity}<span className="text-lg text-gray-500 font-normal">%</span></p>
            </div>
            <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-5 text-center">
              <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">Hum. Media</p>
              <p className="text-3xl font-bold text-gray-800">{sensorData.currentBox.mediaHumidity}<span className="text-lg text-gray-500 font-normal">%</span></p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Status Aktuator</h4>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(sensorData.currentBox.actuators).map(([key, value]) => (
                <div key={key} className={`border rounded-xl p-4 flex flex-col items-center justify-center transition-colors ${value === 'ON' ? 'bg-mag-green/10 border-mag-green/30' : 'bg-gray-50 border-gray-100'}`}>
                    {key === 'heater' && <Thermometer size={24} className={`mb-2 ${value === 'ON' ? 'text-mag-green' : 'text-gray-300'}`} />}
                    {key === 'kipas' && <Wind size={24} className={`mb-2 ${value === 'ON' ? 'text-blue-500' : 'text-gray-300'}`} />}
                    {key === 'pompa' && <Droplets size={24} className={`mb-2 ${value === 'ON' ? 'text-blue-400' : 'text-gray-300'}`} />}
                    <p className={`text-xs font-bold uppercase tracking-wider ${value === 'ON' ? 'text-gray-800' : 'text-gray-400'}`}>{key}</p>
                    <p className={`text-[10px] mt-1 font-bold ${value === 'ON' ? 'text-mag-green' : 'text-gray-300'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side Cards */}
        <div className="space-y-6">
          {/* Prediction Card */}
          <div className="bg-[#1a2332] rounded-2xl p-6 shadow-lg text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sprout size={100} />
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
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-4">Informasi Sistem</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-sm text-gray-500">Status Gateway</span>
                <span className="text-sm font-semibold text-mag-green">Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Database</span>
                <span className="text-sm font-semibold text-mag-green">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
