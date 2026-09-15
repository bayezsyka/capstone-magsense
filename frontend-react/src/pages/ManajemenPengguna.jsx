import React, { useState, useEffect } from 'react';
import { Users, UserPlus, RefreshCw, Pencil, Trash2, PlusCircle, Building2, Check, X } from 'lucide-react';
import { 
  getAllUsers, createUser, updateUser, deleteUser,
  getAllTenants, createTenant, updateTenant, deleteTenant
} from '../services/api';
import toast from 'react-hot-toast';

export default function ManajemenPengguna() {
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'tenants'
  const [data, setData] = useState({ users: [], tenants: [] });
  const [isLoading, setIsLoading] = useState(true);
  
  const [modal, setModal] = useState({ isOpen: false, type: 'add', data: null });

  // Fetch Data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await getAllUsers();
        setData(prev => ({ ...prev, users: res || [] }));
      } else {
        const res = await getAllTenants();
        setData(prev => ({ ...prev, tenants: res || [] }));
      }
    } catch (error) {
      toast.error(error.error || 'Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Handle Delete
  const handleDelete = (id) => {
    toast((t) => (
      <div className="space-y-4">
        <p className="font-bold text-slate-800">Yakin ingin menghapus data ini?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors">Batal</button>
          <button onClick={async () => { 
            toast.dismiss(t.id);
            const loadId = toast.loading('Menghapus...');
            try {
              if (activeTab === 'users') {
                await deleteUser(id);
              } else {
                await deleteTenant(id);
              }
              toast.success('Berhasil dihapus', { id: loadId });
              fetchData();
            } catch (error) {
              toast.error(error.error || 'Gagal menghapus', { id: loadId });
            }
          }} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors">Hapus</button>
        </div>
      </div>
    ), { duration: Infinity });
  };

  // Open Modal
  const openModal = (type, item = null) => {
    setModal({ isOpen: true, type, data: item || {} });
  };

  // Close Modal
  const closeModal = () => {
    setModal({ isOpen: false, type: 'add', data: null });
  };

  // Submit Modal
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    
    // Convert is_active string to boolean
    if (payload.is_active) {
       payload.is_active = payload.is_active === 'true';
    }

    try {
      if (activeTab === 'users') {
        if (modal.type === 'add') {
          await createUser(payload);
        } else {
          await updateUser(modal.data.id, payload);
        }
      } else {
        if (modal.type === 'add') {
          await createTenant(payload);
        } else {
          await updateTenant(modal.data.id, payload);
        }
      }
      toast.success('Data berhasil disimpan');
      closeModal();
      fetchData();
    } catch (error) {
      toast.error(error.error || 'Gagal menyimpan data');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center text-mag-green shadow-inner">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-wide">Manajemen Master</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Kelola Users dan Tenants</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="p-3 rounded-xl text-slate-400 hover:text-mag-green hover:bg-emerald-50 transition-all">
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => openModal('add')} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-mag-green to-emerald-400 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-sm font-black shadow-glow transition-all duration-300">
            <PlusCircle size={18} />
            Tambah {activeTab === 'users' ? 'User' : 'Tenant'}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-2 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'users' ? 'border-mag-green text-mag-green' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Users size={16} /> Users
        </button>
        <button 
          onClick={() => setActiveTab('tenants')}
          className={`pb-3 px-2 font-black text-sm flex items-center gap-2 border-b-2 transition-all ${activeTab === 'tenants' ? 'border-mag-green text-mag-green' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Building2 size={16} /> Tenants
        </button>
      </div>

      {/* DATAGRID */}
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-soft border border-white/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-wider border-b border-slate-100">
              <tr>
                {activeTab === 'users' ? (
                  <>
                    <th className="px-6 py-4">USERNAME</th>
                    <th className="px-6 py-4">EMAIL</th>
                    <th className="px-6 py-4">ROLE</th>
                    <th className="px-6 py-4">STATUS</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4">NAMA TENANT</th>
                    <th className="px-6 py-4">KODE</th>
                    <th className="px-6 py-4">KONTAK</th>
                    <th className="px-6 py-4">STATUS</th>
                  </>
                )}
                <th className="px-6 py-4 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                 <tr><td colSpan="5" className="text-center py-10 text-slate-400">Loading...</td></tr>
              ) : data[activeTab].length === 0 ? (
                 <tr><td colSpan="5" className="text-center py-10 text-slate-400">Belum ada data</td></tr>
              ) : data[activeTab].map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  {activeTab === 'users' ? (
                    <>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.username || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{item.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase border ${item.role === 'admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-emerald-50 text-mag-green border-emerald-100'}`}>
                          {item.role}
                        </span>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.name}</td>
                      <td className="px-6 py-4 text-sm font-bold text-indigo-500">{item.tenant_code}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{item.contact_person} <br/><span className="text-xs">{item.phone}</span></td>
                    </>
                  )}
                  <td className="px-6 py-4">
                    {item.is_active ? 
                      <span className="flex items-center gap-1 text-xs font-black text-mag-green"><Check size={14}/> Aktif</span> : 
                      <span className="flex items-center gap-1 text-xs font-black text-red-500"><X size={14}/> Nonaktif</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openModal('edit', item)} className="text-slate-400 hover:text-blue-500 transition-colors"><Pencil size={18}/></button>
                      <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-black text-slate-800 mb-6">
              {modal.type === 'add' ? 'Tambah' : 'Edit'} {activeTab === 'users' ? 'User' : 'Tenant'}
            </h2>
            
            <form onSubmit={handleModalSubmit} className="space-y-4">
              {activeTab === 'users' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Tenant ID (Opsional)</label>
                    <input name="tenant_id" defaultValue={modal.data?.tenant_id} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Username</label>
                    <input name="username" defaultValue={modal.data?.username} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Email*</label>
                    <input name="email" type="email" required defaultValue={modal.data?.email} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">{modal.type === 'add' ? 'Password*' : 'Password Baru (Opsional)'}</label>
                    <input name="password" type="password" required={modal.type === 'add'} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Role*</label>
                    <select name="role" required defaultValue={modal.data?.role} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none text-sm font-bold">
                      <option value="pembudidaya">Pembudidaya / Operator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Nama Tenant*</label>
                    <input name="name" required defaultValue={modal.data?.name} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Kode Tenant (Unik)*</label>
                    <input name="tenant_code" required defaultValue={modal.data?.tenant_code} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Kontak Person</label>
                    <input name="contact_person" defaultValue={modal.data?.contact_person} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">No. HP</label>
                    <input name="phone" defaultValue={modal.data?.phone} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none text-sm font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Alamat</label>
                    <textarea name="address" defaultValue={modal.data?.address} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-mag-green outline-none text-sm font-bold"></textarea>
                  </div>
                </>
              )}
              
              <div className="space-y-1 pt-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="is_active" value="true" defaultChecked={modal.data?.is_active ?? true} className="w-4 h-4 text-mag-green rounded focus:ring-mag-green border-gray-300" />
                  Status Aktif
                </label>
              </div>

              <div className="flex gap-3 pt-6 mt-6 border-t border-slate-100">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">Batal</button>
                <button type="submit" className="flex-1 px-4 py-3 bg-mag-green text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-glow">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
