import { useState } from 'react';
import { Download, Filter, Search, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-04-22');
  const [selectedBox, setSelectedBox] = useState('all');

  const dummyData = [
    { id: 1, time: '10:05:22', date: '2026-04-22', box: '#1', temp: '28.5°C', rh: '70.2%', media: '45%', phase: 'ADULT LARVA', act: 'Valve #1', status: 'green' },
    { id: 2, time: '10:05:15', date: '2026-04-22', box: '#2', temp: '32.5°C', rh: '75%', media: '62%', phase: 'PREPUPA', act: 'Kipas IN/OUT', status: 'orange' },
    { id: 3, time: '10:00:00', date: '2026-04-22', box: '#3', temp: '29.1°C', rh: '68.5%', media: '58%', phase: 'BABY LARVA', act: 'Idle', status: 'green' },
    { id: 4, time: '09:55:10', date: '2026-04-22', box: '#1', temp: '28.4°C', rh: '70%', media: '44.5%', phase: 'ADULT LARVA', act: 'Idle', status: 'green' },
    { id: 5, time: '09:50:00', date: '2026-04-22', box: '#2', temp: '31.8°C', rh: '74.2%', media: '61.5%', phase: 'PREPUPA', act: 'Kipas IN/OUT', status: 'orange' }
  ];

  const getPhaseColor = (phase) => {
    switch (phase) {
      case 'BABY LARVA': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'ADULT LARVA': return 'bg-green-50 text-mag-green border-green-100';
      case 'PREPUPA': return 'bg-purple-50 text-purple-600 border-purple-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* TOOLBAR */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          {/* SEARCH */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari ID Box atau Kejadian..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-mag-green outline-none font-medium text-gray-700"
            />
          </div>

          {/* DATE */}
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-600 focus:ring-2 focus:ring-mag-green outline-none cursor-pointer"
            />
          </div>

          {/* FILTER BOX */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={selectedBox}
              onChange={(e) => setSelectedBox(e.target.value)}
              className="pl-11 pr-10 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-600 focus:ring-2 focus:ring-mag-green outline-none cursor-pointer appearance-none"
            >
              <option value="all">Filter Box</option>
              <option value="1">Box #1</option>
              <option value="2">Box #2</option>
              <option value="3">Box #3</option>
            </select>
          </div>
        </div>

        {/* EXPORT */}
        <button className="flex items-center gap-2 px-5 py-2.5 bg-mag-green text-white rounded-xl text-sm font-bold hover:bg-green-600 shadow-sm transition">
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-white text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-100">
              <tr>
                <th className="px-6 py-5">WAKTU (WIB)</th>
                <th className="px-6 py-5">BOX</th>
                <th className="px-6 py-5">SUHU</th>
                <th className="px-6 py-5">RH UDARA</th>
                <th className="px-6 py-5">RH MEDIA</th>
                <th className="px-6 py-5">FASE DOMINAN</th>
                <th className="px-6 py-5">AKTUATOR AKTIF</th>
                <th className="px-6 py-5">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dummyData.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-gray-800 font-bold text-sm">{log.time}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{log.date}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-800 font-black text-sm">{log.box}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-700 font-semibold">{log.temp}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-700 font-semibold">{log.rh}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-700 font-semibold">{log.media}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg border text-[10px] font-black tracking-wider ${getPhaseColor(log.phase)}`}>
                      {log.phase}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.act !== 'Idle' ? (
                      <span className="text-gray-700 font-medium flex items-center gap-2 text-sm">
                        <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'green' ? 'bg-mag-green' : 'bg-orange-400'}`}></div>
                        {log.act}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">Idle</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${log.status === 'green' ? 'bg-mag-green' : 'bg-orange-400'}`}></span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="px-6 py-5 bg-white border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-500 font-medium">
            Menampilkan <span className="font-bold text-gray-700">1 - 5</span> dari <span className="font-bold text-gray-700">1,240</span> entri
          </p>
          <div className="flex items-center gap-1.5">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 text-gray-400 hover:text-gray-600 hover:bg-gray-50">
              <ChevronLeft size={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-mag-green text-white font-bold shadow-sm text-xs">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-600 font-bold hover:bg-gray-50 text-xs">2</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-600 font-bold hover:bg-gray-50 text-xs">3</button>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-100 text-gray-600 hover:bg-gray-50">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}