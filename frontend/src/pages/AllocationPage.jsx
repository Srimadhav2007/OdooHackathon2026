import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { ArrowRightLeft, AlertTriangle, Search, Plus, CheckCircle, X, Clock } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default function AllocationPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [allocations, setAllocations] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    try {
      const [allocsRes, transRes, assetsRes, empRes] = await Promise.all([
        api.get('/allocations'),
        api.get('/allocations/transfers/pending'),
        api.get('/assets'),
        api.get('/employees')
      ]);
      setAllocations(allocsRes.data || []);
      setTransfers(transRes.data || []);
      setAvailableAssets(assetsRes.data.assets || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Derived filtered arrays
  const filteredAllocations = allocations.filter(a => a.asset?.tag?.toLowerCase().includes(searchQuery.toLowerCase()) || a.employee?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.department?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredTransfers = transfers.filter(t => t.allocation?.asset?.tag?.toLowerCase().includes(searchQuery.toLowerCase()) || t.requestedBy?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.targetEmployee?.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  const selectedAsset = availableAssets.find(a => a.id === selectedAssetId);
  const isConflict = selectedAsset?.status === 'ALLOCATED';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetEmployeeId = e.target.employeeId.value;
    
    try {
      if (isConflict) {
        // Assume there is an active allocation we are requesting to transfer from
        const activeAlloc = allocations.find(a => a.assetId === selectedAsset.id && a.status === 'ACTIVE');
        if (activeAlloc) {
          await api.post(`/allocations/${activeAlloc.id}/transfer-request`, { targetEmployeeId });
        }
      } else {
        await api.post('/allocations', { assetId: selectedAsset.id, employeeId: targetEmployeeId });
      }
      setIsModalOpen(false);
      setSelectedAssetId('');
      fetchAllData();
    } catch (error) {
      console.error(error);
      alert('Failed to allocate asset');
    }
  };

  const processReturn = async (id) => {
    try {
      await api.put(`/allocations/${id}/return`, { conditionNotes: 'Returned' });
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const resolveTransfer = async (id, action) => {
    try {
      await api.put(`/allocations/transfers/${id}/${action.toLowerCase()}`);
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl pb-12">
      <PageHeader
        eyebrow="Operations"
        title="Allocations & Transfers"
        description="Manage asset distribution, track returns, and resolve allocation conflicts across departments."
        actions={[
          <Button key="allocate" variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} className="mr-2" /> Allocate Asset
          </Button>
        ]}
      />

      {/* FIXED BORDERS: All KPI Cards now have border-l-4 and dynamic counts */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 border-l-4 border-violet-600 p-5">
          <div className="rounded-full bg-violet-100 p-3 text-violet-700"><CheckCircle size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Allocations</p>
            <p className="text-2xl font-bold text-slate-900">{allocations.filter(a => a.status === 'Active').length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-red-500 p-5">
          <div className="rounded-full bg-red-100 p-3 text-red-600"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Overdue Returns</p>
            <p className="text-2xl font-bold text-slate-900">{allocations.filter(a => a.status === 'Overdue').length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-amber-500 p-5">
          <div className="rounded-full bg-amber-100 p-3 text-amber-600"><Clock size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Transfers</p>
            <p className="text-2xl font-bold text-slate-900">{transfers.length}</p>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex border-b border-slate-200">
          <button onClick={() => setActiveTab('active')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'active' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            Active Allocations {activeTab === 'active' && <motion.div layoutId="allocTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
          <button onClick={() => setActiveTab('transfers')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'transfers' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            Transfer Requests {transfers.length > 0 && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{transfers.length}</span>}
            {activeTab === 'transfers' && <motion.div layoutId="allocTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab === 'active' ? 'allocations' : 'transfers'} by tag or person...`}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {activeTab === 'active' ? (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-6 py-3 font-medium">Asset</th><th className="px-6 py-3 font-medium">Assigned To</th><th className="px-6 py-3 font-medium">Department</th><th className="px-6 py-3 font-medium">Assigned Date</th><th className="px-6 py-3 font-medium">Expected Return</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 text-right font-medium">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredAllocations.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{row.asset?.tag}</div>
                          <div className="text-xs text-slate-500">{row.asset?.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">{row.employee?.name || row.department?.name}</div>
                          <div className="text-xs text-slate-500">{row.employee?.email || '-'}</div>
                        </td>
                        <td className="px-6 py-4">{row.department?.name || row.employee?.department?.name || '-'}</td>
                        <td className="px-6 py-4">{new Date(row.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-slate-500">{row.expectedReturn ? new Date(row.expectedReturn).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4">
                          <Badge tone={row.status === 'ACTIVE' ? 'success' : row.status === 'OVERDUE' ? 'warning' : 'neutral'}>{row.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {row.status === 'ACTIVE' && (
                            <Button variant="ghost" onClick={() => processReturn(row.id)} className="px-2 py-1 text-xs">Process Return</Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-6 py-3 font-medium">Asset</th><th className="px-6 py-3 font-medium">Transfer Details</th><th className="px-6 py-3 font-medium">Date Requested</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 text-right font-medium">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredTransfers.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{row.allocation?.asset?.tag}</div>
                          <div className="text-xs text-slate-500">{row.allocation?.asset?.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-600">{row.requestedBy?.name}</span>
                            <ArrowRightLeft size={14} className="text-slate-400" />
                            <span className="font-medium text-slate-900">{row.targetEmployee?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{new Date(row.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4"><Badge tone="warning">{row.status}</Badge></td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => resolveTransfer(row.id, 'Reject')} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700">Reject</Button>
                            <Button variant="secondary" onClick={() => resolveTransfer(row.id, 'Approve')} className="px-3 py-1 text-xs shadow-none">Approve</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedAssetId(''); }} title="Assign Asset">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Select Asset</label>
            <select required value={selectedAssetId} onChange={(e) => setSelectedAssetId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
              <option value="" disabled>Choose an asset...</option>
              {availableAssets.map(asset => <option key={asset.id} value={asset.id}>{asset.tag} - {asset.name} {asset.status === 'ALLOCATED' ? '(Already Taken)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Select Employee</label>
            <select name="employeeId" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
              <option value="" disabled>Choose an employee...</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
          </div>
          <AnimatePresence>
            {isConflict && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900">Allocation Conflict</h4>
                      <p className="mt-1 text-sm text-amber-700">Asset is held by <strong>{selectedAsset.currentHolder}</strong>. This will submit a Transfer Request.</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className={isConflict ? "bg-amber-600 text-white ring-amber-600 hover:bg-amber-700" : ""}>{isConflict ? 'Request Transfer' : 'Allocate Asset'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}