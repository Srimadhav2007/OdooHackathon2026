import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, AlertCircle, Plus, Search, CheckCircle, Clock, ShieldAlert, X } from 'lucide-react';
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
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
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

export default function MaintenancePage() {
  const [activeTab, setActiveTab] = useState('active');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [requests, setRequests] = useState([
    { id: 'TKT-042', assetTag: 'AF-0003', assetName: 'Conference Projector', issue: 'Lamp burning out, flickering', priority: 'High', status: 'Pending Approval', requestedBy: 'Operations', date: '2026-07-12' },
    { id: 'TKT-041', assetTag: 'AF-0112', assetName: 'Warehouse Scanner', issue: 'Battery not holding charge', priority: 'Medium', status: 'In Progress', assignedTo: 'Tech Support - Bob', date: '2026-07-11' },
    { id: 'TKT-039', assetTag: 'AF-0089', assetName: 'MacBook Air', issue: 'Keyboard sticky keys', priority: 'Low', status: 'Resolved', assignedTo: 'Apple Care', date: '2026-07-09' },
  ]);

  const getPriorityBadge = (priority) => {
    switch(priority) {
      case 'High': return <Badge tone="error">High Priority</Badge>;
      case 'Medium': return <Badge tone="warning">Medium</Badge>;
      case 'Low': return <Badge tone="info">Low</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'Pending Approval': return <Badge tone="warning">Pending Approval</Badge>;
      case 'In Progress': return <Badge tone="sky">In Progress</Badge>;
      case 'Resolved': return <Badge tone="success">Resolved</Badge>;
      case 'Rejected': return <Badge tone="error">Rejected</Badge>;
      default: return <Badge tone="neutral">{status}</Badge>;
    }
  };

  const handleRaiseRequest = (e) => {
    e.preventDefault();
    const newReq = {
      id: `TKT-0${requests.length + 40}`,
      assetTag: e.target.asset.value.split(' ')[0], // rudimentary extract for demo
      assetName: e.target.asset.value.split('- ')[1] || 'Asset',
      issue: e.target.issue.value,
      priority: e.target.priority.value,
      status: 'Pending Approval',
      requestedBy: 'You',
      date: new Date().toISOString().split('T')[0]
    };
    setRequests([newReq, ...requests]);
    setIsModalOpen(false);
  };

  return (
    <div className="relative mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Operations"
        title="Maintenance Workflow"
        description="Raise repair tickets, approve workflows, and track asset downtime."
        actions={[
          <Button key="raise" variant="primary" onClick={() => setIsModalOpen(true)}>
            <AlertCircle size={18} className="mr-2" />
            Raise Request
          </Button>
        ]}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5 flex items-center gap-4 border-l-4 border-amber-500">
          <div className="rounded-full bg-amber-100 p-3 text-amber-600">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
            <p className="text-2xl font-bold text-slate-900">{requests.filter(r => r.status === 'Pending Approval').length}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 border-l-4 border-sky-500">
          <div className="rounded-full bg-sky-100 p-3 text-sky-600">
            <Wrench size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">In Progress</p>
            <p className="text-2xl font-bold text-slate-900">{requests.filter(r => r.status === 'In Progress').length}</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4 border-l-4 border-emerald-500">
          <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Recently Resolved</p>
            <p className="text-2xl font-bold text-slate-900">{requests.filter(r => r.status === 'Resolved').length}</p>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex border-b border-slate-200">
          <button onClick={() => setActiveTab('active')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'active' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            Active Tickets
            {activeTab === 'active' && <motion.div layoutId="maintTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
          <button onClick={() => setActiveTab('history')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            Maintenance History
            {activeTab === 'history' && <motion.div layoutId="maintTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Search by ticket ID or asset tag..." className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-4 text-sm text-slate-900 transition-colors focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"/>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Ticket / Asset</th>
                    <th className="px-6 py-3 font-medium">Issue Detail</th>
                    <th className="px-6 py-3 font-medium">Priority</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {requests.filter(r => activeTab === 'active' ? r.status !== 'Resolved' : r.status === 'Resolved').map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{row.id}</div>
                        <div className="text-xs font-semibold text-violet-600">{row.assetTag}</div>
                        <div className="text-xs text-slate-500">{row.assetName}</div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="truncate text-slate-900">{row.issue}</div>
                        <div className="text-xs text-slate-400">Reported on {row.date} by {row.requestedBy}</div>
                      </td>
                      <td className="px-6 py-4">{getPriorityBadge(row.priority)}</td>
                      <td className="px-6 py-4">
                        {getStatusBadge(row.status)}
                        {row.assignedTo && <div className="mt-1 text-xs text-slate-500">Tech: {row.assignedTo}</div>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {row.status === 'Pending Approval' ? (
                          <Button variant="secondary" className="px-3 py-1 text-xs shadow-none">Review</Button>
                        ) : row.status === 'In Progress' ? (
                          <Button variant="ghost" className="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700">Mark Resolved</Button>
                        ) : (
                          <Button variant="ghost" className="px-2 py-1 text-xs">View Log</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Raise Maintenance Request">
        <form onSubmit={handleRaiseRequest} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Select Asset</label>
            <select name="asset" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
              <option value="">Choose an asset...</option>
              <option value="AF-0044 - Desktop PC">AF-0044 - Desktop PC</option>
              <option value="AF-0012 - Office Printer">AF-0012 - Office Printer</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Priority Level</label>
            <select name="priority" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
              <option value="Low">Low - Cosmetic or non-blocking</option>
              <option value="Medium">Medium - Partial functionality loss</option>
              <option value="High">High Priority - Completely broken/blocked</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Issue Description</label>
            <textarea name="issue" required rows={3} placeholder="Describe the problem in detail..." className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 caret-violet-600 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"></textarea>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Upload Photo (Optional)</label>
            <div className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-4 hover:bg-slate-100 transition-colors">
              <span className="text-sm text-slate-500">Click to attach image</span>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}