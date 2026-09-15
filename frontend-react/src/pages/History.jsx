import React, { useState, useEffect } from 'react';
import { 
  getAllSensorData, getAllCvResults, getAllHarvestPredictions, getAllActuatorLogs 
} from '../services/api';
import { Activity, Camera, Sprout, Settings2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState('sensor');
  const [data, setData] = useState({ sensor: [], cv: [], harvest: [], actuator: [] });
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'sensor') {
        const res = await getAllSensorData();
        setData(p => ({ ...p, sensor: res || [] }));
      } else if (activeTab === 'cv') {
        const res = await getAllCvResults();
        setData(p => ({ ...p, cv: res || [] }));
      } else if (activeTab === 'harvest') {
        const res = await getAllHarvestPredictions();
        setData(p => ({ ...p, harvest: res || [] }));
      } else if (activeTab === 'actuator') {
        const res = await getAllActuatorLogs();
        setData(p => ({ ...p, actuator: res || [] }));
      }
    } catch (error) {
      toast.error(error.error || 'Gagal memuat data riwayat');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  return (
    <div className="space-y-6 pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-wide">Riwayat Data</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Log aktivitas sistem IoT dan ML</p>
        </div>
        <button onClick={fetchData} className="p-3 rounded-xl text-slate-400 hover:text-mag-green hover:bg-emerald-50 transition-all">
          <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-4 border-b border-slate-200">
        <button onClick={() => setActiveTab('sensor')} className={`pb-3 px-2 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'sensor' ? 'border-mag-green text-mag-green' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Activity size={16} /> Sensor Data
        </button>
        <button onClick={() => setActiveTab('cv')} className={`pb-3 px-2 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'cv' ? 'border-mag-green text-mag-green' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Camera size={16} /> CV Results
        </button>
        <button onClick={() => setActiveTab('harvest')} className={`pb-3 px-2 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'harvest' ? 'border-mag-green text-mag-green' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Sprout size={16} /> Harvest Predictions
        </button>
        <button onClick={() => setActiveTab('actuator')} className={`pb-3 px-2 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'actuator' ? 'border-mag-green text-mag-green' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Settings2 size={16} /> Actuator Logs
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-soft border border-white/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50/50 text-slate-400 font-black uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="px-6 py-5">TIMESTAMP</th>
                {activeTab === 'sensor' && (
                  <>
                    <th className="px-6 py-5">BOX ID</th>
                    <th className="px-6 py-5">AIR TEMP</th>
                    <th className="px-6 py-5">AIR HUMIDITY</th>
                    <th className="px-6 py-5">MEDIA HUMIDITY</th>
                  </>
                )}
                {activeTab === 'cv' && (
                  <>
                    <th className="px-6 py-5">BOX ID</th>
                    <th className="px-6 py-5">DOMINANT PHASE</th>
                    <th className="px-6 py-5">CONFIDENCE</th>
                    <th className="px-6 py-5">DETECTIONS</th>
                  </>
                )}
                {activeTab === 'harvest' && (
                  <>
                    <th className="px-6 py-5">BOX ID</th>
                    <th className="px-6 py-5">ESTIMATED DAYS</th>
                    <th className="px-6 py-5">URGENCY LEVEL</th>
                  </>
                )}
                {activeTab === 'actuator' && (
                  <>
                    <th className="px-6 py-5">BOX ID</th>
                    <th className="px-6 py-5">TYPE</th>
                    <th className="px-6 py-5">STATUS</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan="6" className="text-center py-10 text-gray-400 font-medium">Memuat riwayat...</td></tr>
              ) : data[activeTab].length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-gray-400 font-medium">Belum ada data riwayat.</td></tr>
              ) : data[activeTab].map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-bold">{new Date(item.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-800 font-black">{item.box_id ? item.box_id.substring(0,8) + '...' : '-'}</td>
                  
                  {activeTab === 'sensor' && (
                    <>
                      <td className="px-6 py-4 text-slate-700 font-semibold">{item.air_temp}°C</td>
                      <td className="px-6 py-4 text-slate-700 font-semibold">{item.air_humidity}%</td>
                      <td className="px-6 py-4 text-slate-700 font-semibold">{item.media_humidity}%</td>
                    </>
                  )}
                  {activeTab === 'cv' && (
                    <>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-lg border text-[10px] font-black tracking-wider bg-blue-50 text-blue-600 border-blue-100">
                          {item.dominant_phase}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-semibold">{item.confidence_score}</td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                         {item.detection_counts ? JSON.stringify(item.detection_counts) : '-'}
                      </td>
                    </>
                  )}
                  {activeTab === 'harvest' && (
                    <>
                      <td className="px-6 py-4 text-slate-700 font-bold">{item.estimated_days} Hari</td>
                      <td className="px-6 py-4 text-slate-700 font-semibold">{item.urgency_level}</td>
                    </>
                  )}
                  {activeTab === 'actuator' && (
                    <>
                      <td className="px-6 py-4 text-slate-700 font-semibold uppercase">{item.type}</td>
                      <td className="px-6 py-4">
                        {item.status ? 
                          <span className="text-mag-green font-black text-xs">ON</span> : 
                          <span className="text-slate-400 font-black text-xs">OFF</span>
                        }
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}