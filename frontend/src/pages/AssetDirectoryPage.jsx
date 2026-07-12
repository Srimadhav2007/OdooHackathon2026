import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Laptop, Settings, ArrowRightLeft, X, CheckCircle } from 'lucide-react';
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
          <div className="max-h-[80vh] overflow-y-auto p-6">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default function AssetDirectoryPage() {
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [assets, setAssets] = useState([
    { id: 1, tag: 'AF-0001', name: 'MacBook Pro 16"', category: 'Electronics', location: 'HQ - Floor 3', status: 'Allocated', holder: 'Alicia Dean' },
    { id: 2, tag: 'AF-0002', name: 'Dell UltraSharp 27"', category: 'Electronics', location: 'HQ - Storage', status: 'Available', holder: '-' },
    { id: 3, tag: 'AF-0003', name: 'Conference Projector', category: 'Electronics', location: 'Meeting Room B', status: 'Under Maintenance', holder: '-' },
    { id: 4, tag: 'AF-0004', name: 'Ford Transit Van', category: 'Vehicles', location: 'Warehouse Parking', status: 'Reserved', holder: '-' },
    { id: 5, tag: 'AF-0005', name: 'Ergonomic Chair', category: 'Furniture', location: 'HQ - Floor 2', status: 'Available', holder: '-' },
  ]);

  // Derived State: The filtered list
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.tag.toLowerCase().includes(searchQuery.toLowerCase()) || asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || asset.category.toLowerCase() === categoryFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || asset.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available': return <Badge tone="success">Available</Badge>;
      case 'Allocated': return <Badge tone="violet">Allocated</Badge>;
      case 'Reserved': return <Badge tone="sky">Reserved</Badge>;
      case 'Under Maintenance': return <Badge tone="warning">Maintenance</Badge>;
      default: return <Badge tone="neutral">{status}</Badge>;
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    const newAsset = {
      id: Date.now(),
      tag: `AF-000${assets.length + 1}`,
      name: e.target.assetName.value,
      category: e.target.category.value,
      location: e.target.location.value,
      status: 'Available',
      holder: '-',
    };
    setAssets([newAsset, ...assets]);
    setIsRegisterModalOpen(false);
    triggerToast(`Successfully registered ${newAsset.tag}`);
  };

  return (
    <div className="relative mx-auto max-w-7xl pb-12">
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 50, x: '-50%' }} className="fixed bottom-8 left-1/2 z-50 flex items-center gap-3 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-2xl">
            <CheckCircle size={18} className="text-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        eyebrow="Inventory"
        title="Asset Directory"
        description="Centralized registry of all corporate assets, their current statuses, and locations."
        actions={[
          <Button key="register" variant="primary" onClick={() => setIsRegisterModalOpen(true)}>
            <Plus size={18} className="mr-2" /> Register Asset
          </Button>
        ]}
      />

      <div className="mt-8">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by tag or name..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 caret-violet-600 transition-colors focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
              />
            </div>
            <div className="flex items-center gap-3">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
                <option value="all">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="vehicles">Vehicles</option>
                <option value="furniture">Furniture</option>
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="allocated">Allocated</option>
                <option value="under maintenance">Under Maintenance</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Asset Tag & Name</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Current Holder</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredAssets.length === 0 ? (
                  <tr><td colSpan="6" className="py-8 text-center text-slate-500">No assets match your search.</td></tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{asset.tag}</div>
                        <div className="text-xs text-slate-500">{asset.name}</div>
                      </td>
                      <td className="px-6 py-4">{asset.category}</td>
                      <td className="px-6 py-4">{asset.location}</td>
                      <td className="px-6 py-4">{getStatusBadge(asset.status)}</td>
                      <td className="px-6 py-4">{asset.holder}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {asset.status === 'Available' && (
                            <Button variant="secondary" onClick={() => triggerToast(`Navigating to allocation for ${asset.tag}...`)} className="px-2 py-1 text-xs shadow-none">
                              <ArrowRightLeft size={14} />
                            </Button>
                          )}
                          <Button variant="ghost" onClick={() => triggerToast(`Opening settings for ${asset.tag}...`)} className="px-2 py-1 text-xs">
                            <Settings size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal isOpen={isRegisterModalOpen} onClose={() => setIsRegisterModalOpen(false)} title="Register New Asset">
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Asset Name/Model</label>
            <input name="assetName" type="text" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="e.g. Dell XPS 15" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <select name="category" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
                <option value="Electronics">Electronics</option>
                <option value="Vehicles">Vehicles</option>
                <option value="Furniture">Furniture</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Condition</label>
              <select name="condition" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
                <option value="New">New</option><option value="Good">Good</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Initial Location</label>
            <input name="location" type="text" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="e.g. Storage Room A" />
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsRegisterModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Register Asset</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}