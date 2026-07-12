import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, ShieldAlert, Plus, Search, CheckCircle, AlertTriangle, X, FileText, Check, XCircle } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`w-full ${maxWidth} overflow-hidden rounded-2xl bg-white shadow-2xl`}
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

export default function AuditPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConductModalOpen, setIsConductModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);

  const [audits, setAudits] = useState([
    { id: 'ADT-2026-Q3', name: 'Q3 Electronics Audit', scope: 'HQ - Engineering', startDate: '2026-07-10', endDate: '2026-07-20', auditor: 'Priya Sharma', progress: 65, totalAssets: 120, status: 'In Progress', discrepancies: 2 },
    { id: 'ADT-2026-V1', name: 'Fleet Vehicle Check', scope: 'Logistics', startDate: '2026-07-12', endDate: '2026-07-15', auditor: 'David Cho', progress: 0, totalAssets: 15, status: 'Pending Start', discrepancies: 0 },
    { id: 'ADT-2026-Q2', name: 'Q2 Furniture Inventory', scope: 'All Departments', startDate: '2026-04-01', endDate: '2026-04-10', auditor: 'Alicia Dean', progress: 100, totalAssets: 340, status: 'Closed', discrepancies: 5 },
  ]);

  // Mock list of assets to verify during an audit
  const [auditItems, setAuditItems] = useState([
    { tag: 'AF-0114', name: 'ThinkPad T14', status: 'Pending' },
    { tag: 'AF-0115', name: 'Dell UltraSharp 27"', status: 'Verified' },
    { tag: 'AF-0116', name: 'MacBook Pro 16"', status: 'Missing' },
  ]);

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const newAudit = {
      id: `ADT-2026-N${audits.length + 1}`,
      name: e.target.auditName.value,
      scope: e.target.scope.value,
      startDate: e.target.startDate.value,
      endDate: e.target.endDate.value,
      auditor: e.target.auditor.value,
      progress: 0,
      totalAssets: Math.floor(Math.random() * 100) + 10, // Mock number
      status: 'Pending Start',
      discrepancies: 0
    };
    setAudits([newAudit, ...audits]);
    setIsCreateModalOpen(false);
  };

  const openConductModal = (audit) => {
    setSelectedAudit(audit);
    setIsConductModalOpen(true);
  };

  const markAsset = (tag, status) => {
    setAuditItems(prev => prev.map(item => item.tag === tag ? { ...item, status } : item));
  };

  return (
    <div className="relative mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Compliance"
        title="Asset Audits"
        description="Run structured verification cycles, track discrepancies, and ensure inventory accuracy."
        actions={[
          <Button key="create" variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} className="mr-2" />
            New Audit Cycle
          </Button>
        ]}
      />

      {/* KPI Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 border-l-4 border-violet-600 p-5">
          <div className="rounded-full bg-violet-100 p-3 text-violet-700">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Cycles</p>
            <p className="text-2xl font-bold text-slate-900">{audits.filter(a => a.status !== 'Closed').length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-amber-500 p-5">
          <div className="rounded-full bg-amber-100 p-3 text-amber-600">
            <ShieldAlert size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Discrepancies Found</p>
            <p className="text-2xl font-bold text-slate-900">
              {audits.reduce((acc, curr) => acc + (curr.status === 'In Progress' ? curr.discrepancies : 0), 0)}
            </p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-emerald-500 p-5">
          <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Verification Rate</p>
            <p className="text-2xl font-bold text-slate-900">94.2%</p>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex border-b border-slate-200">
          <button onClick={() => setActiveTab('active')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'active' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            Active Audits
            {activeTab === 'active' && <motion.div layoutId="auditTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
          <button onClick={() => setActiveTab('history')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            Audit History
            {activeTab === 'history' && <motion.div layoutId="auditTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" placeholder="Search audits..." className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-4 text-sm text-slate-900 transition-colors focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"/>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-medium">Audit Cycle</th>
                    <th className="px-6 py-3 font-medium">Scope & Auditor</th>
                    <th className="px-6 py-3 font-medium">Timeline</th>
                    <th className="px-6 py-3 font-medium">Progress</th>
                    <th className="px-6 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {audits.filter(a => activeTab === 'active' ? a.status !== 'Closed' : a.status === 'Closed').map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{row.name}</div>
                        <div className="text-xs text-slate-500">{row.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900">{row.scope}</div>
                        <div className="text-xs text-slate-500">Assigned: {row.auditor}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-900">{row.startDate}</div>
                        <div className="text-xs text-slate-500">to {row.endDate}</div>
                      </td>
                      <td className="px-6 py-4 w-48">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700">{row.progress}%</span>
                          {row.discrepancies > 0 && <span className="text-amber-600 font-medium">{row.discrepancies} Flags</span>}
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className={`h-2 rounded-full ${row.progress === 100 ? 'bg-success-500' : 'bg-violet-500'}`} style={{ width: `${row.progress}%` }}></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {row.status === 'Closed' ? (
                          <Button variant="ghost" className="px-2 py-1 text-xs"><FileText size={14} className="mr-1"/> Report</Button>
                        ) : (
                          <Button variant="secondary" onClick={() => openConductModal(row)} className="px-3 py-1 text-xs shadow-none">Conduct Audit</Button>
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

      {/* CREATE AUDIT MODAL */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Audit Cycle">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Audit Name</label>
            <input name="auditName" type="text" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="e.g. 2026 Annual Hardware Audit" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Scope (Department/Category)</label>
            <select name="scope" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
              <option value="All Departments">All Departments</option>
              <option value="HQ - Engineering">HQ - Engineering</option>
              <option value="Electronics Category">Electronics Only</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start Date</label>
              <input name="startDate" type="date" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End Date</label>
              <input name="endDate" type="date" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assign Auditor</label>
            <select name="auditor" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
              <option value="Alicia Dean">Alicia Dean (Admin)</option>
              <option value="Priya Sharma">Priya Sharma</option>
              <option value="David Cho">David Cho</option>
            </select>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Launch Audit</Button>
          </div>
        </form>
      </Modal>

      {/* CONDUCT AUDIT MODAL (The Auditor's View) */}
      <Modal isOpen={isConductModalOpen} onClose={() => setIsConductModalOpen(false)} title={`Conducting: ${selectedAudit?.name}`} maxWidth="max-w-2xl">
        <div className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-900">Scan or Verify Assets</p>
            <p className="text-xs text-slate-500">Scope: {selectedAudit?.scope} • Total Items: {selectedAudit?.totalAssets}</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="Scan Barcode / Asset Tag..." className="rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" autoFocus />
          </div>
        </div>

        <div className="space-y-3">
          {auditItems.map((item) => (
            <div key={item.tag} className="flex items-center justify-between rounded-xl border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
              <div>
                <p className="font-semibold text-slate-900">{item.tag}</p>
                <p className="text-xs text-slate-500">{item.name}</p>
              </div>
              
              {/* Auditor Action Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={() => markAsset(item.tag, 'Verified')}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${item.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <Check size={14} /> Verified
                </button>
                <button 
                  onClick={() => markAsset(item.tag, 'Damaged')}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${item.status === 'Damaged' ? 'bg-amber-100 text-amber-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <AlertTriangle size={14} /> Damaged
                </button>
                <button 
                  onClick={() => markAsset(item.tag, 'Missing')}
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${item.status === 'Missing' ? 'bg-red-100 text-red-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  <XCircle size={14} /> Missing
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Progress is saved automatically.</p>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsConductModalOpen(false)}>Pause Audit</Button>
            <Button type="button" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 ring-emerald-600">Close Audit Cycle</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}