import React, { useState, useEffect } from 'react';
import { Box as BoxIcon, PlusCircle, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { getAllBoxes, createBox, updateBox, deleteBox, getAllTenants } from '../services/api';
import toast from 'react-hot-toast';

export default function ManajemenBox() {
  const [boxes, setBoxes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, type: 'add', data: null });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [boxesRes, tenantsRes] = await Promise.all([
        getAllBoxes(),
        getAllTenants()
      ]);
      setBoxes(boxesRes || []);
      setTenants(tenantsRes || []);
    } catch (error) {
      toast.error(error.error || 'Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = (id) => {
    toast((t) => (
      <div className="space-y-4">
        <p className="font-bold text-slate-800">Yakin ingin menghapus Box ini?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">Batal</button>
          <button onClick={async () => { 
            toast.dismiss(t.id);
            const loadId = toast.loading('Menghapus...');
            try {
              await deleteBox(id);
              toast.success('Box berhasil dihapus', { id: loadId });
              fetchData();
            } catch (error) {
              toast.error(error.error || 'Gagal menghapus Box', { id: loadId });
            }
          }} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors">Hapus</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  const handleToggleActive = async (box) => {
    try {
      await updateBox(box.id, { ...box, is_active: !box.is_active });
      fetchData(); // refresh list
    } catch (error) {
      toast.error(error.error || 'Gagal mengubah status Box');
    }
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    if (payload.is_active) {
       payload.is_active = payload.is_active === 'true';
    }

    try {
      if (modal.type === 'add') {
        await createBox(payload);
      } else {
        await updateBox(modal.data.id, payload);
      }
      toast.success('Box berhasil disimpan');
      setModal({ isOpen: false, type: 'add', data: null });
      fetchData();
    } catch (error) {
      toast.error(error.error || 'Gagal menyimpan Box');
    }
  };

  const getTenantName = (tenantId) => {
    const t = tenants.find(x => x.id === tenantId);
    return t ? t.name : 'Unknown';
  };

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-indigo-500 shadow-inner">
            <BoxIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-wide">Manajemen Box</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Kelola unit Box IoT dan statusnya</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-3 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all">
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setModal({ isOpen: true, type: 'add', data: null })} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-sm font-black shadow-glow transition-all duration-300">
            <PlusCircle size={18} />
            Tambah Box
          </button>
        </div>
      </div>

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
           <div className="col-span-full py-10 text-center text-slate-400">Loading...</div>
        ) : boxes.length === 0 ? (
           <div className="col-span-full py-10 text-center text-slate-400">Belum ada Box terdaftar</div>
        ) : boxes.map((box) => (
          <div key={box.id} className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 transition-all duration-300 hover:shadow-xl group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800">{box.name}</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">Tenant: {getTenantName(box.tenant_id)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setModal({ isOpen: true, type: 'edit', data: box })} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(box.id)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Status:</span>
              <button 
                onClick={() => handleToggleActive(box)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${box.is_active ? 'bg-mag-green' : 'bg-slate-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${box.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-black text-slate-800 mb-6">
              {modal.type === 'add' ? 'Tambah' : 'Edit'} Box
            </h2>
            
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Nama Box*</label>
                <input name="name" required defaultValue={modal.data?.name} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Pilih Tenant*</label>
                <select name="tenant_id" required defaultValue={modal.data?.tenant_id} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold">
                  <option value="">-- Pilih Tenant --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 pt-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="is_active" value="true" defaultChecked={modal.data?.is_active ?? true} className="w-4 h-4 text-indigo-500 rounded focus:ring-indigo-500 border-gray-300" />
                  Status Aktif
                </label>
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
                <button type="button" onClick={() => setModal({ isOpen: false, type: 'add', data: null })} className="flex-1 px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-indigo-500 text-white font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-glow">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
