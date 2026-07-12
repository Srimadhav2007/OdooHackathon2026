import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Shield, Search, Filter, Clock, CheckCircle, AlertTriangle, Info, ArrowRightLeft, ShieldAlert, Download } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [searchQuery, setSearchQuery] = useState('');
  const [logFilter, setLogFilter] = useState('all');

  const [notifications, setNotifications] = useState([
    { id: 1, type: 'alert', title: 'Overdue Return Alert', message: 'Laptop AF-0114 assigned to Priya Sharma is overdue.', time: '10 min ago', read: false },
    { id: 2, type: 'warning', title: 'Audit Discrepancy Flagged', message: 'Missing item reported during Q3 Electronics Audit.', time: '1 hour ago', read: false },
    { id: 3, type: 'info', title: 'Transfer Request Pending', message: 'Marcus Cole requested iPad Pro. Approval required.', time: '3 hours ago', read: true },
  ]);

  const auditLogs = [
    { id: 'LOG-8842', timestamp: '2026-07-12 14:22:05', actor: 'Alicia Dean', role: 'Admin', action: 'ROLE_PROMOTION', target: 'David Cho -> Asset Manager', ip: '192.168.1.45', status: 'SUCCESS' },
    { id: 'LOG-8841', timestamp: '2026-07-12 13:15:12', actor: 'SYSTEM', role: 'Automated', action: 'STATUS_UPDATE', target: 'AF-0114 -> OVERDUE', ip: 'localhost', status: 'SUCCESS' },
    { id: 'LOG-8840', timestamp: '2026-07-12 11:05:33', actor: 'Marcus Cole', role: 'Dept Head', action: 'RESOURCE_BOOK', target: 'Conference Room A', ip: '10.0.4.12', status: 'SUCCESS' },
    { id: 'LOG-8839', timestamp: '2026-07-12 09:42:10', actor: 'Priya Sharma', role: 'Employee', action: 'UNAUTHORIZED_ACCESS', target: '/api/admin/settings', ip: '10.0.4.55', status: 'DENIED' },
  ];

  // Filters
  const filteredNotes = notifications.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.message.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredLogs = auditLogs.filter(l => 
    (logFilter === 'all' || l.action.toLowerCase().includes(logFilter)) &&
    (l.id.toLowerCase().includes(searchQuery.toLowerCase()) || l.actor.toLowerCase().includes(searchQuery.toLowerCase()) || l.ip.includes(searchQuery))
  );

  const getNotificationIcon = (type) => type === 'alert' ? <AlertTriangle size={18} className="text-red-600"/> : type === 'warning' ? <ShieldAlert size={18} className="text-amber-600"/> : <CheckCircle size={18} className="text-emerald-600"/>;

  // --- PRO FEATURE: REAL CSV EXPORT ---
  const exportCSV = () => {
    const headers = ['Timestamp', 'Log ID', 'Actor', 'Role', 'Event Action', 'Target Entity', 'IP Address', 'Status'];
    const rows = filteredLogs.map(log => `"${log.timestamp}","${log.id}","${log.actor}","${log.role}","${log.action}","${log.target}","${log.ip}","${log.status}"`);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "assetflow_audit_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative mx-auto max-w-7xl pb-12">
      <PageHeader
        eyebrow="Monitoring"
        title="Activity & Notifications"
        actions={[
          activeTab === 'logs' ? (
            <Button key="export" variant="secondary" onClick={exportCSV}>
              <Download size={18} className="mr-2" /> Export Logs (CSV)
            </Button>
          ) : (
            <Button key="read" variant="secondary" onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}>
              <CheckCircle size={18} className="mr-2" /> Mark all as read
            </Button>
          )
        ]}
      />

      <div className="mt-8">
        <div className="flex border-b border-slate-200">
          <button onClick={() => { setActiveTab('notifications'); setSearchQuery(''); }} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Bell size={18} /> My Notifications
            {notifications.filter(n => !n.read).length > 0 && <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs text-red-600">{notifications.filter(n => !n.read).length}</span>}
            {activeTab === 'notifications' && <motion.div layoutId="activityTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
          <button onClick={() => { setActiveTab('logs'); setSearchQuery(''); }} className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'logs' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <Shield size={18} /> System Audit Logs
            {activeTab === 'logs' && <motion.div layoutId="activityTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
        </div>

        <div className="mt-6">
          <Card className="min-h-[500px] overflow-hidden p-0">
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={activeTab === 'notifications' ? "Search alerts..." : "Search logs by ID, Actor, or IP..."} className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" />
              </div>
              <div className="flex items-center gap-3">
                {activeTab === 'logs' && (
                  <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
                    <option value="all">All Events</option><option value="auth">Auth & Access</option><option value="asset">Asset Changes</option>
                  </select>
                )}
              </div>
            </div>

            {activeTab === 'notifications' && (
              <div className="divide-y divide-slate-100">
                {filteredNotes.map((note) => (
                  <div key={note.id} className={`flex gap-4 p-5 transition-colors hover:bg-slate-50 ${!note.read ? 'bg-violet-50/30' : 'bg-white'}`}>
                    <div className="mt-1 shrink-0"><div className="rounded-full bg-slate-100 p-2">{getNotificationIcon(note.type)}</div></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between"><h4 className={`text-sm font-semibold ${!note.read ? 'text-slate-900' : 'text-slate-700'}`}>{note.title}</h4><span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={12} /> {note.time}</span></div>
                      <p className="mt-1 text-sm text-slate-600">{note.message}</p>
                      {!note.read && (
                        <div className="mt-3 flex gap-3"><button className="text-xs font-medium text-violet-600 hover:text-violet-700" onClick={() => setNotifications(notifications.map(n => n.id === note.id ? { ...n, read: true } : n))}>Mark as read</button></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-6 py-3 font-medium">Timestamp / ID</th><th className="px-6 py-3 font-medium">Actor</th><th className="px-6 py-3 font-medium">Event Action</th><th className="px-6 py-3 font-medium">Target Entity</th><th className="px-6 py-3 text-right font-medium">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4"><div className="font-medium text-slate-900">{log.timestamp}</div><div className="font-mono text-xs text-slate-400">{log.id}</div></td>
                        <td className="px-6 py-4"><div className="font-medium text-slate-900">{log.actor}</div><div className="text-xs text-slate-500">{log.role} • <span className="font-mono text-slate-400">{log.ip}</span></div></td>
                        <td className="px-6 py-4"><span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">{log.action}</span></td>
                        <td className="px-6 py-4 font-medium text-slate-600">{log.target}</td>
                        <td className="px-6 py-4 text-right"><Badge tone={log.status === 'SUCCESS' ? 'success' : 'error'}>{log.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}