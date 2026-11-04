import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getAllSensorData,
  getAllCvResults,
  getAllHarvestPredictions,
  getAllActuatorLogs,
  getAllBoxes
} from '../services/api';
import {
  Activity,
  Camera,
  Sprout,
  Settings2,
  RefreshCw,
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const TAB_CONFIG = {
  sensor: {
    label: 'Sensor Data',
    placeholder: 'Cari box, ID, atau sumber data...',
    columnCount: 5
  },
  cv: {
    label: 'CV Results',
    placeholder: 'Cari box, fase dominan, atau sumber...',
    columnCount: 5
  },
  harvest: {
    label: 'Harvest Predictions',
    placeholder: 'Cari box, urgensi, atau sumber...',
    columnCount: 4
  },
  actuator: {
    label: 'Actuator Logs',
    placeholder: 'Cari box, tipe, status, atau sumber...',
    columnCount: 4
  }
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('id-ID');
};

const formatBoxId = (boxId) => (
  typeof boxId === 'string' && boxId.length > 0 ? `${boxId.substring(0, 8)}...` : '-'
);

const formatDetections = (item) => {
  const counts = item.detection_counts && typeof item.detection_counts === 'object' ? item.detection_counts : {};
  const baby = item.baby_larva ?? counts.baby_larva ?? 0;
  const adult = item.adult_larva ?? counts.adult_larva ?? 0;
  const prepupa = item.prepupa ?? counts.prepupa ?? 0;
  const pupa = item.pupa ?? counts.pupa ?? 0;
  const total = item.total_detected ?? counts.total_detected ?? (Number(baby) + Number(adult) + Number(prepupa) + Number(pupa));
  return `Total ${total} • Bayi ${baby} • Dewasa ${adult} • Prepupa ${prepupa} • Pupa ${pupa}`;
};

const getSearchText = (item, tab, boxNameMap) => {
  const fields = [
    item.box_name,
    boxNameMap[item.box_id],
    item.box_id,
    item.source
  ];

  if (tab === 'cv') fields.push(item.dominant_phase);
  if (tab === 'harvest') fields.push(item.urgency_level);
  if (tab === 'actuator') fields.push(item.type, item.status);

  return fields.filter(Boolean).join(' ').toLowerCase();
};

const filterAndPaginate = (source, { activeTab, search, boxFilter, startDate, endDate, page, pageSize, boxNameMap }) => {
  let rows = Array.isArray(source) ? source.slice() : [];
  const keyword = String(search || '').toLowerCase();

  if (keyword) {
    rows = rows.filter((item) => getSearchText(item, activeTab, boxNameMap).includes(keyword));
  }

  if (boxFilter) {
    rows = rows.filter((item) => String(item.box_id) === String(boxFilter));
  }

  if (startDate || endDate) {
    const startTime = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const endTime = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;

    rows = rows.filter((item) => {
      const time = new Date(item.timestamp).getTime();
      if (Number.isNaN(time)) return false;
      if (startTime !== null && time < startTime) return false;
      if (endTime !== null && time > endTime) return false;
      return true;
    });
  }

  const total = rows.length;
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
  const safePage = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
  const startIndex = (safePage - 1) * pageSize;

  return {
    rows: rows.slice(startIndex, startIndex + pageSize),
    pagination: { total, totalPages, page: safePage, limit: pageSize }
  };
};

const buildPageList = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const result = [];

  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      result.push(`ellipsis-${page}`);
    }
    result.push(page);
  });

  return result;
};

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState('sensor');
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boxes, setBoxes] = useState([]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [boxFilter, setBoxFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, page: 1, limit: 10 });

  const requestIdRef = useRef(0);

  const boxNameMap = useMemo(() => {
    const map = {};
    (Array.isArray(boxes) ? boxes : []).forEach((box) => {
      if (box?.id) map[box.id] = box.name;
    });
    return map;
  }, [boxes]);

  useEffect(() => {
    getAllBoxes()
      .then((list) => setBoxes(Array.isArray(list) ? list : []))
      .catch(() => setBoxes([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);

    const params = { page, limit: pageSize };
    if (search) params.search = search;
    if (boxFilter) params.box_id = boxFilter;
    if (startDate) params.start = startDate;
    if (endDate) params.end = endDate;

    try {
      let response;

      if (activeTab === 'sensor') {
        response = await getAllSensorData(params);
      } else if (activeTab === 'cv') {
        response = await getAllCvResults(params);
      } else if (activeTab === 'harvest') {
        response = await getAllHarvestPredictions(params);
      } else {
        response = await getAllActuatorLogs(params);
      }

      if (requestId !== requestIdRef.current) return;

      if (response && !Array.isArray(response) && Array.isArray(response.data)) {
        const meta = response.pagination || {};
        const nextTotal = Number(meta.total) || response.data.length;
        const nextTotalPages = Number(meta.totalPages) || (nextTotal > 0 ? 1 : 0);
        const nextPage = Number(meta.page) || page;

        setRows(response.data);
        setPagination({
          total: nextTotal,
          totalPages: nextTotalPages,
          page: nextPage,
          limit: Number(meta.limit) || pageSize
        });

        if (nextTotalPages > 0 && page > nextTotalPages) {
          setPage(nextTotalPages);
        }
        return;
      }

      const result = filterAndPaginate(Array.isArray(response) ? response : [], {
        activeTab,
        search,
        boxFilter,
        startDate,
        endDate,
        page,
        pageSize,
        boxNameMap
      });

      setRows(result.rows);
      setPagination(result.pagination);

      if (result.pagination.page !== page) {
        setPage(result.pagination.page);
      }
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      toast.error(error.error || 'Gagal memuat data riwayat');
      setRows([]);
      setPagination({ total: 0, totalPages: 0, page: 1, limit: pageSize });
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [activeTab, page, pageSize, search, boxFilter, startDate, endDate, boxNameMap]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setBoxFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const changePageSize = (event) => {
    setPageSize(Number(event.target.value));
    setPage(1);
  };

  const hasFilters = Boolean(searchInput || boxFilter || startDate || endDate);
  const pageNumbers = buildPageList(page, pagination.totalPages);
  const startItem = pagination.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, pagination.total);
  const canGoPrevious = page > 1 && !isLoading;
  const canGoNext = pagination.totalPages > 0 && page < pagination.totalPages && !isLoading;

  return (
    <div className="space-y-6 pb-10">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-wide">Riwayat Data</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Log aktivitas sistem IoT dan ML</p>
        </div>
        <button onClick={fetchData} className="p-3 rounded-xl text-slate-400 hover:text-mag-green hover:bg-emerald-50 transition-all" title="Muat ulang">
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-4 border-b border-slate-200">
        <button onClick={() => changeTab('sensor')} className={`pb-3 px-2 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'sensor' ? 'border-mag-green text-mag-green' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Activity size={16} /> Sensor Data
        </button>
        <button onClick={() => changeTab('cv')} className={`pb-3 px-2 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'cv' ? 'border-mag-green text-mag-green' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Camera size={16} /> CV Results
        </button>
        <button onClick={() => changeTab('harvest')} className={`pb-3 px-2 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'harvest' ? 'border-mag-green text-mag-green' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Sprout size={16} /> Harvest Predictions
        </button>
        <button onClick={() => changeTab('actuator')} className={`pb-3 px-2 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'actuator' ? 'border-mag-green text-mag-green' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
          <Settings2 size={16} /> Actuator Logs
        </button>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-soft border border-white/50 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={TAB_CONFIG[activeTab].placeholder}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-mag-green focus:ring-2 focus:ring-mag-green/20"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={boxFilter}
            onChange={(event) => { setBoxFilter(event.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-mag-green focus:ring-2 focus:ring-mag-green/20"
          >
            <option value="">Semua Box</option>
            {boxes.map((box) => (
              <option key={box.id} value={box.id}>{box.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => { setStartDate(event.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-mag-green focus:ring-2 focus:ring-mag-green/20"
              title="Dari tanggal"
            />
            <span className="text-xs font-bold text-slate-400">s.d.</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => { setEndDate(event.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-mag-green focus:ring-2 focus:ring-mag-green/20"
              title="Sampai tanggal"
            />
          </div>

          <select
            value={pageSize}
            onChange={changePageSize}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-mag-green focus:ring-2 focus:ring-mag-green/20"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size} / halaman</option>
            ))}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              Reset
            </button>
          )}
        </div>
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
                    <th className="px-6 py-5">BOX</th>
                    <th className="px-6 py-5">AIR TEMP</th>
                    <th className="px-6 py-5">AIR HUMIDITY</th>
                    <th className="px-6 py-5">MEDIA HUMIDITY</th>
                  </>
                )}
                {activeTab === 'cv' && (
                  <>
                    <th className="px-6 py-5">BOX</th>
                    <th className="px-6 py-5">DOMINANT PHASE</th>
                    <th className="px-6 py-5">CONFIDENCE</th>
                    <th className="px-6 py-5">DETECTIONS</th>
                  </>
                )}
                {activeTab === 'harvest' && (
                  <>
                    <th className="px-6 py-5">BOX</th>
                    <th className="px-6 py-5">ESTIMATED DAYS</th>
                    <th className="px-6 py-5">URGENCY LEVEL</th>
                  </>
                )}
                {activeTab === 'actuator' && (
                  <>
                    <th className="px-6 py-5">BOX</th>
                    <th className="px-6 py-5">TYPE</th>
                    <th className="px-6 py-5">STATUS</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={TAB_CONFIG[activeTab].columnCount} className="text-center py-10 text-gray-400 font-medium">Memuat riwayat...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={TAB_CONFIG[activeTab].columnCount} className="text-center py-10 text-gray-400 font-medium">Belum ada data riwayat yang cocok.</td></tr>
              ) : rows.map((item, idx) => (
                <tr key={item.id || `${activeTab}-${idx}`} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-bold">{formatTimestamp(item.timestamp)}</td>
                  <td className="px-6 py-4 text-slate-800 font-black">
                    {item.box_name || boxNameMap[item.box_id] || formatBoxId(item.box_id)}
                  </td>

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
                        {formatDetections(item)}
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
                        {String(item.status || '').toUpperCase() === 'ON' ?
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

        {/* PAGINATION */}
        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-400">
            {pagination.total === 0
              ? 'Tidak ada data'
              : `Menampilkan ${startItem}–${endItem} dari ${pagination.total} data`}
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!canGoPrevious}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-mag-green hover:text-mag-green disabled:cursor-not-allowed disabled:opacity-40"
              title="Halaman sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>

            {pageNumbers.map((item) => (
              typeof item === 'number' ? (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  disabled={isLoading}
                  className={`min-w-[36px] rounded-lg border px-2 py-2 text-xs font-black transition ${
                    item === page
                      ? 'border-mag-green bg-mag-green text-white shadow-glow'
                      : 'border-slate-200 text-slate-500 hover:border-mag-green hover:text-mag-green'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {item}
                </button>
              ) : (
                <span key={item} className="px-1 text-xs font-bold text-slate-400">...</span>
              )
            ))}

            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
              disabled={!canGoNext}
              className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-mag-green hover:text-mag-green disabled:cursor-not-allowed disabled:opacity-40"
              title="Halaman berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
