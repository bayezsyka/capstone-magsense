import { Package, ThermometerSun, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Monitoring() {
  const chartData = [
    { time: '00:00', temp: 26, humidity: 75 },
    { time: '04:00', temp: 25, humidity: 78 },
    { time: '08:00', temp: 28, humidity: 72 },
    { time: '12:00', temp: 31, humidity: 62 },
    { time: '16:00', temp: 29, humidity: 68 },
    { time: '20:00', temp: 27, humidity: 74 }
  ];

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

  return (
    <div className="space-y-6 pb-10">
      
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-mag-green">
            <Package size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">TOTAL BOX</p>
            <p className="text-2xl font-black text-gray-800">3 <span className="text-sm font-bold text-gray-500">Unit</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
            <ThermometerSun size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">RERATA SUHU</p>
            <p className="text-2xl font-black text-gray-800">30.0 <span className="text-sm font-bold text-gray-500">°C</span></p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-400">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">AKTUATOR AKTIF</p>
            <p className="text-2xl font-black text-gray-800">2 <span className="text-sm font-bold text-gray-500">Perangkat</span></p>
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-1">Tren Mikroklimat</h3>
        <p className="text-sm text-gray-500 mb-8">Visualisasi suhu dan kelembapan 24 jam terakhir</p>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{r: 6}} />
              <Line type="monotone" dataKey="temp" stroke="#00b074" strokeWidth={3} dot={false} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BOX CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Box 1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-500 tracking-wider">RUANG 1</span>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-black text-gray-700 tracking-wider">BOX #1</span>
            </div>
          </div>
          <div className="p-6 space-y-5 flex-1">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-gray-500 font-medium"><ThermometerSun size={16}/> Suhu Udara</span>
              <span className="font-bold text-gray-800">28.5 °C</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-gray-500 font-medium"><Package size={16}/> Kelembapan Udara</span>
              <span className="font-bold text-gray-800">70.2 %</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-gray-500 font-medium"><Package size={16}/> Kelembapan Media</span>
              <span className="font-bold text-orange-500">45.0 %</span>
            </div>
          </div>
          <div className="px-6 pb-6 pt-2">
            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-3">Status Aktuator</p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-mag-green text-white rounded-lg text-xs font-bold">
              <Zap size={14} /> Solenoid Valve #1
            </div>
          </div>
        </div>

        {/* Box 2 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-orange-400"></div>
          <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-500 tracking-wider">RUANG 2</span>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-black text-gray-700 tracking-wider">BOX #2</span>
            </div>
            <div className="text-orange-400"><Zap size={18} /></div>
          </div>
          <div className="p-6 space-y-5 flex-1">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-gray-500 font-medium"><ThermometerSun size={16}/> Suhu Udara</span>
              <span className="font-bold text-orange-500">32.5 °C</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-gray-500 font-medium"><Package size={16}/> Kelembapan Udara</span>
              <span className="font-bold text-gray-800">75.0 %</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-gray-500 font-medium"><Package size={16}/> Kelembapan Media</span>
              <span className="font-bold text-gray-800">62.0 %</span>
            </div>
          </div>
          <div className="px-6 pb-6 pt-2">
            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-3">Status Aktuator</p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-mag-green text-white rounded-lg text-xs font-bold">
              <Zap size={14} /> Kipas Exhaust
            </div>
          </div>
        </div>

        {/* Box 3 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-500 tracking-wider">RUANG 3</span>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-black text-gray-700 tracking-wider">BOX #3</span>
            </div>
          </div>
          <div className="p-6 space-y-5 flex-1">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-gray-500 font-medium"><ThermometerSun size={16}/> Suhu Udara</span>
              <span className="font-bold text-gray-800">29.1 °C</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-gray-500 font-medium"><Package size={16}/> Kelembapan Udara</span>
              <span className="font-bold text-gray-800">68.5 %</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-gray-500 font-medium"><Package size={16}/> Kelembapan Media</span>
              <span className="font-bold text-gray-800">58.0 %</span>
            </div>
          </div>
          <div className="px-6 pb-6 pt-2">
            <p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-3">Status Aktuator</p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-400 border border-gray-100 rounded-lg text-xs font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div> Standby Mode
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
