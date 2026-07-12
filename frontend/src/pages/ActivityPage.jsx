import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Shield, Search, Filter, Clock, CheckCircle, AlertTriangle, Info, ArrowRightLeft, ShieldAlert, Download } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState('notifications');

  // --- Mock Data: Notifications ---
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'alert', title: 'Overdue Return Alert', message: 'Laptop AF-0114 assigned to Priya Sharma is 2 days overdue.', time: '10 min ago', read: false },
    { id: 2, type: 'warning', title: 'Audit Discrepancy Flagged', message: 'Missing item reported during Q3 Electronics Audit (MacBook Pro 16").', time: '1 hour ago', read: false },
    { id: 3, type: 'info', title: 'Transfer Request Pending', message: 'Marcus Cole requested iPad Pro from David Cho. Approval required.', time: '3 hours ago', read: true },
    { id: 4, type: 'success', title: 'Maintenance Approved', message: 'Ticket TKT-041 (Warehouse Scanner) has been approved and assigned to tech.', time: 'Yesterday', read: true },
    { id: 5, type: 'success', title: 'Booking Confirmed', message: 'Your booking for Conference Room A is confirmed for today at 3:00 PM.', time: 'Yesterday', read: true },
  ]);

  // --- Mock Data: System Audit Logs (SIEM-style) ---
  const auditLogs = [
    { id: 'LOG-8842', timestamp: '2026-07-12 14:22:05', actor: 'Alicia Dean', role: 'Admin', action: 'ROLE_PROMOTION', target: 'David Cho -> Asset Manager', ip: '192.168.1.45', status: 'SUCCESS' },
    { id: 'LOG-8841', timestamp: '2026-07-12 13:15:12', actor: 'SYSTEM', role: 'Automated', action: 'STATUS_UPDATE', target: 'AF-0114 -> OVERDUE', ip: 'localhost', status: 'SUCCESS' },
    { id: 'LOG-8840', timestamp: '2026-07-12 11:05:33', actor: 'Marcus Cole', role: 'Dept Head', action: 'RESOURCE_BOOK', target: 'Conference Room A', ip: '10.0.4.12', status: 'SUCCESS' },
    { id: 'LOG-8839', timestamp: '2026-07-12 09:42:10', actor: 'Priya Sharma', role: 'Employee', action: 'UNAUTHORIZED_ACCESS', target: '/api/admin/settings', ip: '10.0.4.55', status: 'DENIED' },
    { id: 'LOG-8838', timestamp: '2026-07-11 16:20:00', actor: 'David Cho', role: 'Asset Manager', action: 'ASSET_REGISTER', target: 'AF-0118 (Dell Monitor)', ip: '192.168.1.88', status: 'SUCCESS' },
  ];

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alert': return <div className="rounded-full bg-red-100 p-2 text-red-600"><AlertTriangle size={18} /></div>;
      case 'warning': return <div className="rounded-full bg-amber-100 p-2 text-amber-600"><ShieldAlert size={18} /></div>;
      case 'success': return <div className="rounded-full bg-emerald-100 p-2 text-emerald-600"><CheckCircle size={18} /></div>;
      default: return <div className="rounded-full bg-sky-100 p-2 text-sky-600"><Info size={18} /></div>;
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative mx-auto max-w-7xl pb-12">
      <PageHeader
        eyebrow="Monitoring"
        title="Activity & Notifications"
        description="Stay updated on personal alerts and monitor system-wide compliance events."
        actions={[
          activeTab === 'logs' ? (
            <Button key="export" variant="secondary">
              <Download size={18} className="mr-2" />
              Export Logs (CSV)
            </Button>
          ) : (
            <Button key="read" variant="secondary" onClick={markAllAsRead}>
              <CheckCircle size={18} className="mr-2" />
              Mark all as read
            </Button>
          )
        ]}
      />

      <div className="mt-8">
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'notifications' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <Bell size={18} />
            My Notifications
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-xs text-red-600">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
            {activeTab === 'notifications' && <motion.div layoutId="activityTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
          
          <button
            onClick={() => setActiveTab('logs')}
            className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'logs' ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            <Shield size={18} />
            System Audit Logs
            {activeTab === 'logs' && <motion.div layoutId="activityTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
          </button>
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden p-0 min-h-[500px]">
            
            {/* Toolbar */}
            <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder={activeTab === 'notifications' ? "Search alerts..." : "Search logs by ID, Actor, or IP..."}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 caret-violet-600 transition-colors focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600"
                />
              </div>
              
              <div className="flex items-center gap-3">
                {activeTab === 'logs' && (
                  <select className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
                    <option value="all">All Events</option>
                    <option value="auth">Auth & Access</option>
                    <option value="assets">Asset Changes</option>
                    <option value="roles">Role Promotions</option>
                  </select>
                )}
                <Button variant="secondary" className="px-3 py-2 shadow-none">
                  <Filter size={16} />
                </Button>
              </div>
            </div>

            {/* TAB CONTENT: Notifications */}
            {activeTab === 'notifications' && (
              <div className="divide-y divide-slate-100">
                {notifications.map((note) => (
                  <div key={note.id} className={`flex gap-4 p-5 transition-colors hover:bg-slate-50 ${!note.read ? 'bg-violet-50/30' : 'bg-white'}`}>
                    <div className="shrink-0 mt-1">
                      {getNotificationIcon(note.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-semibold ${!note.read ? 'text-slate-900' : 'text-slate-700'}`}>{note.title}</h4>
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock size={12} />
                          {note.time}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{note.message}</p>
                      
                      {!note.read && (
                        <div className="mt-3 flex gap-3">
                          {note.type === 'alert' && <Button variant="primary" className="px-3 py-1.5 text-xs">Resolve Issue</Button>}
                          {note.type === 'info' && <Button variant="secondary" className="px-3 py-1.5 text-xs">Review Request</Button>}
                          <button 
                            className="text-xs font-medium text-violet-600 hover:text-violet-700"
                            onClick={() => setNotifications(notifications.map(n => n.id === note.id ? { ...n, read: true } : n))}
                          >
                            Mark as read
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT: System Audit Logs */}
            {activeTab === 'logs' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Timestamp / ID</th>
                      <th className="px-6 py-3 font-medium">Actor</th>
                      <th className="px-6 py-3 font-medium">Event Action</th>
                      <th className="px-6 py-3 font-medium">Target Entity</th>
                      <th className="px-6 py-3 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{log.timestamp}</div>
                          <div className="font-mono text-xs text-slate-400">{log.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{log.actor}</div>
                          <div className="text-xs text-slate-500">{log.role} • <span className="font-mono text-slate-400">{log.ip}</span></div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {log.target}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Badge tone={log.status === 'SUCCESS' ? 'success' : 'error'}>
                            {log.status}
                          </Badge>
                        </td>
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