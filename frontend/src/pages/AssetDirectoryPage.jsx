import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Laptop, Settings, ArrowRightLeft, X } from 'lucide-react';
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

  // Reactive mock data for the table
  const [assets, setAssets] = useState([
    { id: 1, tag: 'AF-0001', name: 'MacBook Pro 16"', category: 'Electronics', location: 'HQ - Floor 3', status: 'Allocated', holder: 'Alicia Dean' },
    { id: 2, tag: 'AF-0002', name: 'Dell UltraSharp 27"', category: 'Electronics', location: 'HQ - Storage', status: 'Available', holder: '-' },
    { id: 3, tag: 'AF-0003', name: 'Conference Projector', category: 'Electronics', location: 'Meeting Room B', status: 'Under Maintenance', holder: '-' },
    { id: 4, tag: 'AF-0004', name: 'Ford Transit Van', category: 'Vehicles', location: 'Warehouse Parking', status: 'Reserved', holder: '-' },
    { id: 5, tag: 'AF-0005', name: 'Ergonomic Chair', category: 'Furniture', location: 'HQ - Floor 2', status: 'Available', holder: '-' },
  ]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available': return <Badge tone="success">Available</Badge>;
      case 'Allocated': return <Badge tone="violet">Allocated</Badge>;
      case 'Reserved': return <Badge tone="sky">Reserved</Badge>;
      case 'Under Maintenance': return <Badge tone="warning">Maintenance</Badge>;
      case 'Lost': 
      case 'Disposed': return <Badge tone="neutral">{status}</Badge>;
      default: return <Badge tone="neutral">{status}</Badge>;
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    // Simulate adding an asset (backend will handle real auto-generation of tags later)
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
  };

  return (
    <div className="relative mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Inventory"
        title="Asset Directory"
        description="Centralized registry of all corporate assets, their current statuses, and locations."
        actions={[
          <Button key="register" variant="primary" onClick={() => setIsRegisterModalOpen(true)}>
            <Plus size={18} className="mr-2" />
            Register Asset
          </Button>
        ]}
      />

      <div className="mt-8">
        <Card className="overflow-hidden p-0">
          
          {/* Advanced Filter Bar */}
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by tag, name, or serial number..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 caret-violet-600 transition-colors focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600">
                <option value="all">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="vehicles">Vehicles</option>
                <option value="furniture">Furniture</option>
              </select>
              <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600">
                <option value="all">All Statuses</option>
                <option value="available">Available</option>
                <option value="allocated">Allocated</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
              <Button variant="secondary" className="px-3 py-2 shadow-none">
                <Filter size={16} />
              </Button>
            </div>
          </div>

          {/* Asset Data Table */}
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
                {assets.map((asset) => (
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
                          <Button variant="secondary" className="px-2 py-1 text-xs shadow-none" title="Allocate">
                            <ArrowRightLeft size={14} />
                          </Button>
                        )}
                        <Button variant="ghost" className="px-2 py-1 text-xs" title="Manage">
                          <Settings size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Asset Registration Modal */}
      <Modal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
        title="Register New Asset"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4 text-left">
          
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Asset Name/Model</label>
            <input name="assetName" type="text" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 caret-violet-600 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="e.g. Dell XPS 15" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
              <select name="category" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600">
                <option value="Electronics">Electronics</option>
                <option value="Vehicles">Vehicles</option>
                <option value="Furniture">Furniture</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Condition</label>
              <select name="condition" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600">
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Serial Number</label>
              <input name="serial" type="text" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 caret-violet-600 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="e.g. SN-987654321" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Acquisition Date</label>
              <input name="date" type="date" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Initial Location</label>
            <input name="location" type="text" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 caret-violet-600 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="e.g. Storage Room A" />
          </div>
          
          <div className="mt-2 flex items-center gap-2">
            <input type="checkbox" id="shared" className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-600" />
            <label htmlFor="shared" className="text-sm text-slate-600">This is a shared/bookable resource</label>
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