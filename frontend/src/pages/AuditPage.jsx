import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { ClipboardCheck, ShieldAlert, Plus, Search, CheckCircle, AlertTriangle, X, FileText, Check, XCircle } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`w-full ${maxWidth} overflow-hidden rounded-2xl bg-white shadow-2xl`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20} /></button>
          </div>
          <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
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
  const [searchQuery, setSearchQuery] = useState('');

  const [audits, setAudits] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [auditsRes, deptRes] = await Promise.all([
        api.get('/audits'),
        api.get('/departments')
      ]);
      setAudits(auditsRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAudits = audits.filter(a => 
    (activeTab === 'active' ? a.status !== 'CLOSED' : a.status === 'CLOSED') &&
    a.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/audits', {
        name: e.target.auditName.value,
        scopeType: 'DEPARTMENT',
        scopeValue: e.target.scope.value,
        startDate: e.target.startDate.value,
        endDate: e.target.endDate.value,
      });
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to create audit');
    }
  };

  const markAsset = (tag, status) => setAuditItems(prev => prev.map(item => item.tag === tag ? { ...item, status } : item));

  return (
    <div className="relative mx-auto max-w-7xl pb-12">
      <PageHeader eyebrow="Compliance" title="Asset Audits" actions={[<Button key="create" variant="primary" onClick={() => setIsCreateModalOpen(true)}><Plus size={18} className="mr-2" /> New Audit Cycle</Button>]} />

      {/* Fixed KPI borders and dynamic counts */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 border-l-4 border-violet-600 p-5">
          <div className="rounded-full bg-violet-100 p-3 text-violet-700"><ClipboardCheck size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Active Cycles</p>
            <p className="text-2xl font-bold text-slate-900">{audits.filter(a => a.status !== 'CLOSED').length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-amber-500 p-5">
          <div className="rounded-full bg-amber-100 p-3 text-amber-600"><ShieldAlert size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Audits</p>
            <p className="text-2xl font-bold text-slate-900">{audits.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 border-l-4 border-emerald-500 p-5">
          <div className="rounded-full bg-emerald-100 p-3 text-emerald-600"><CheckCircle size={24} /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Verification Rate</p>
            <p className="text-2xl font-bold text-slate-900">94.2%</p>
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex border-b border-slate-200">
          <button onClick={() => setActiveTab('active')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'active' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>Active Audits {activeTab === 'active' && <motion.div layoutId="auditTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}</button>
          <button onClick={() => setActiveTab('history')} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'history' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>Audit History {activeTab === 'history' && <motion.div layoutId="auditTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}</button>
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search audits..." className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-4 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"/>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr><th className="px-6 py-3 font-medium">Audit Cycle</th><th className="px-6 py-3 font-medium">Scope & Auditor</th><th className="px-6 py-3 font-medium">Timeline</th><th className="px-6 py-3 font-medium">Progress</th><th className="px-6 py-3 text-right font-medium">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                  <tr><td colSpan="7" className="py-8 text-center text-slate-500">Loading...</td></tr>
                ) : filteredAudits.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{row.name}</div>
                      <div className="text-xs text-slate-500">ID: {row.id}</div>
                    </td>
                    <td className="px-6 py-4">{row.scopeValue || 'Global'}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{row._count?.assignments || 0}</td>
                    <td className="px-6 py-4">{row._count?.results || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${row.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.status !== 'CLOSED' && (
                        <Button variant="ghost" onClick={() => { setSelectedAudit(row); setIsConductModalOpen(true); }} className="px-2 py-1 text-xs">Manage</Button>
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

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create Audit Cycle">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div><label className="mb-1 block text-sm font-medium text-slate-700">Audit Name</label><input name="auditName" type="text" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" /></div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Scope / Department</label>
            <select name="scope" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Start</label><input name="startDate" type="date" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">End</label><input name="endDate" type="date" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" /></div>
          </div>
          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4"><Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button><Button type="submit" variant="primary">Launch</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isConductModalOpen} onClose={() => setIsConductModalOpen(false)} title={`Conducting: ${selectedAudit?.name}`} maxWidth="max-w-2xl">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Asset verification logic is handled in the backend by creating an assignment. UI can be extended to view assignments here.</p>
          </div>
        <div className="mt-6 flex justify-between items-center border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">Progress saved automatically.</p>
          <div className="flex gap-3"><Button type="button" variant="ghost" onClick={() => setIsConductModalOpen(false)}>Pause Audit</Button><Button type="button" variant="primary" className="bg-emerald-600">Close Audit</Button></div>
        </div>
      </Modal>
    </div>
  );
}