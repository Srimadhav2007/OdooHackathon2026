import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRightLeft, AlertTriangle, Search, Plus, CheckCircle, X, Clock } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

// --- Reusable Modal Component ---
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
          <div className="max-h-[80vh] overflow-y-auto p-6">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default function AllocationPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');

  // Mock Database for Assets (Used in the dropdown)
  const availableAssets = [
    { id: '1', tag: 'AF-0002', name: 'Dell UltraSharp 27"', status: 'Available', currentHolder: null },
    { id: '2', tag: 'AF-0005', name: 'Ergonomic Chair', status: 'Available', currentHolder: null },
    { id: '3', tag: 'AF-0001', name: 'MacBook Pro 16"', status: 'Allocated', currentHolder: 'Alicia Dean' }, // This one will trigger the conflict!
  ];

  // Mock Database for Allocations
  const [allocations, setAllocations] = useState([
    { id: 101, assetTag: 'AF-0001', assetName: 'MacBook Pro 16"', assignedTo: 'Alicia Dean', dept: 'HQ', dateAssigned: '2026-06-01', expectedReturn: '2027-06-01', status: 'Active' },
    { id: 102, assetTag: 'AF-0114', assetName: 'ThinkPad T14', assignedTo: 'Priya Sharma', dept: 'Engineering', dateAssigned: '2026-05-15', expectedReturn: '2026-07-10', status: 'Overdue' },
  ]);

  // Mock Database for Pending Transfers
  const [transfers, setTransfers] = useState([
    { id: 201, assetTag: 'AF-0088', assetName: 'iPad Pro', fromUser: 'David Cho', toUser: 'Marcus Cole', requestedOn: '2026-07-11', status: 'Pending Approval' },
  ]);

  // Handle dropdown selection to check for conflicts
  const selectedAsset = availableAssets.find(a => a.id === selectedAssetId);
  const isConflict = selectedAsset?.status === 'Allocated';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isConflict) {
      console.log('Submitted Transfer Request for:', selectedAsset.tag);
    } else {
      console.log('Submitted New Allocation for:', selectedAsset.tag);
    }
    setIsModalOpen(false);
    setSelectedAssetId('');
  };

  return (
    <div className="relative mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Operations"
        title="Allocations & Transfers"
        description="Manage asset distribution, track returns, and resolve allocation conflicts across departments."
        actions={[
          <Button key="allocate" variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} className="mr-2" />
            Allocate Asset
          </Button>
        ]}
      />

      {/* KPI Summary Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5 flex items-center gap-4 border-l-4 border-violet-600">
          <div className="rounded-full bg-violet-100 p-3 text-violet-700">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Allocations</p>
            <p className="text-2xl font-bold text-slate-900">{allocations.filter(a => a.status === 'Active').length}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 border-l-4 border-red-500">
          <div className="rounded-full bg-red-100 p-3 text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Overdue Returns</p>
            <p className="text-2xl font-bold text-slate-900">{allocations.filter(a => a.status === 'Overdue').length}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 border-l-4 border-amber-500">
          <div className="rounded-full bg-amber-100 p-3 text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Transfers</p>
            <p className="text-2xl font-bold text-slate-900">{transfers.length}</p>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'active' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            Active Allocations
            {activeTab === 'active' && <motion.div layoutId="allocTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'transfers' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            Transfer Requests
            {transfers.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{transfers.length}</span>
            )}
            {activeTab === 'transfers' && <motion.div layoutId="allocTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder={`Search ${activeTab === 'active' ? 'allocations' : 'transfers'}...`}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 caret-violet-600 transition-colors focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {activeTab === 'active' ? (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Asset</th>
                      <th className="px-6 py-3 font-medium">Assigned To</th>
                      <th className="px-6 py-3 font-medium">Assigned Date</th>
                      <th className="px-6 py-3 font-medium">Expected Return</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {allocations.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{row.assetTag}</div>
                          <div className="text-xs text-slate-500">{row.assetName}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{row.assignedTo}</div>
                          <div className="text-xs text-slate-500">{row.dept}</div>
                        </td>
                        <td className="px-6 py-4">{row.dateAssigned}</td>
                        <td className={`px-6 py-4 font-medium ${row.status === 'Overdue' ? 'text-red-600' : 'text-slate-600'}`}>
                          {row.expectedReturn}
                        </td>
                        <td className="px-6 py-4">
                          <Badge tone={row.status === 'Overdue' ? 'error' : 'success'}>{row.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" className="px-2 py-1 text-xs">Process Return</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Asset</th>
                      <th className="px-6 py-3 font-medium">Current Holder</th>
                      <th className="px-6 py-3 font-medium">Requested By</th>
                      <th className="px-6 py-3 font-medium">Date Requested</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {transfers.map((row) => (
                      <tr key={row.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{row.assetTag}</div>
                          <div className="text-xs text-slate-500">{row.assetName}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-900">{row.fromUser}</td>
                        <td className="px-6 py-4 font-medium text-violet-700">{row.toUser}</td>
                        <td className="px-6 py-4">{row.requestedOn}</td>
                        <td className="px-6 py-4">
                          <Badge tone="warning">{row.status}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700">Reject</Button>
                            <Button variant="secondary" className="px-3 py-1 text-xs shadow-none">Approve</Button>
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

      {/* Allocation / Transfer Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setSelectedAssetId(''); }} 
        title="Assign Asset"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Select Asset</label>
            <select 
              required
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600"
            >
              <option value="" disabled>Choose an asset...</option>
              {availableAssets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.tag} - {asset.name} {asset.status === 'Allocated' ? '(Already Taken)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Conflict UI Banner */}
          <AnimatePresence>
            {isConflict && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mt-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900">Allocation Conflict</h4>
                      <p className="mt-1 text-sm text-amber-700">
                        This asset is currently held by <strong>{selectedAsset.currentHolder}</strong>. You cannot allocate it directly. Continuing will submit a Transfer Request to their Department Head.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Assign To (Employee)</label>
              <select required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600">
                <option value="Marcus Cole">Marcus Cole</option>
                <option value="Alicia Dean">Alicia Dean</option>
                <option value="David Cho">David Cho</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Expected Return Date</label>
              <input type="date" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes / Reason (Optional)</label>
            <textarea 
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 caret-violet-600 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600"
              placeholder="e.g. Needed for Q3 marketing project..."
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => { setIsModalOpen(false); setSelectedAssetId(''); }}>Cancel</Button>
            
            {/* Dynamic Submit Button */}
            {isConflict ? (
              <Button type="submit" variant="primary" className="bg-amber-600 hover:bg-amber-700 ring-amber-600 text-white">
                <ArrowRightLeft size={16} className="mr-2" />
                Request Transfer
              </Button>
            ) : (
              <Button type="submit" variant="primary">
                Allocate Asset
              </Button>
            )}
          </div>
        </form>
      </Modal>

    </div>
  );
}