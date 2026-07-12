import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight, Boxes, CalendarClock, PackageCheck, Sparkles, Users, CheckCircle } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import { useNavigate } from 'react-router-dom';

const kpis = [
  { title: 'Assets', value: '284', change: '+12 this month', icon: Boxes, tone: 'violet' },
  { title: 'Allocated', value: '176', change: '+8 today', icon: PackageCheck, tone: 'emerald' },
  { title: 'Maintenance', value: '14', change: '3 urgent', icon: AlertTriangle, tone: 'amber' },
  { title: 'Bookings', value: '31', change: '+5 upcoming', icon: CalendarClock, tone: 'sky' },
];

const activities = [
  { title: 'Laptop 14 assigned to Finance', time: '10 min ago', tone: 'success' },
  { title: 'Printer maintenance scheduled', time: '42 min ago', tone: 'warning' },
  { title: 'Quarterly audit report generated', time: '1 hr ago', tone: 'info' },
];

const maintenance = [
  { title: 'Conference monitor', owner: 'Operations', due: 'Today' },
  { title: 'Warehouse scanner', owner: 'Logistics', due: 'Tomorrow' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000); // Auto-hide after 3 seconds
  };

  return (
    <div className="mx-auto max-w-7xl relative pb-12">
      
      {/* Dynamic Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-50 flex items-center gap-3 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-2xl"
          >
            <CheckCircle size={18} className="text-emerald-400" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <PageHeader
        eyebrow="Overview"
        title="Welcome back, Admin"
        description="A calm view of your asset operations across departments."
        actions={[
          <Button key="1" variant="primary" onClick={() => navigate('/bookings')}>+ New booking</Button>,
          <Button key="2" variant="secondary" onClick={() => triggerToast('Generating PDF Report... Download will begin shortly.')}>Export report</Button>,
        ]}
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => <StatCard key={item.title} {...item} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent activities</h2>
                <p className="text-sm text-slate-500">Latest updates across your operation</p>
              </div>
              <Badge tone="violet">Live</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {activities.map((item) => (
                <div key={item.title} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-white p-2 text-slate-600 shadow-sm"><Sparkles size={16} /></div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.time}</p>
                    </div>
                  </div>
                  <Badge tone={item.tone === 'success' ? 'success' : item.tone === 'warning' ? 'warning' : 'info'}>{item.tone}</Badge>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Pending maintenance</h3>
                <Button variant="ghost" className="px-3 py-2" onClick={() => navigate('/maintenance')}>View all</Button>
              </div>
              <div className="mt-4 space-y-3">
                {maintenance.map((item) => (
                  <div key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <Badge tone="warning">{item.due}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Owner: {item.owner}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Department distribution</h3>
                <ArrowRight size={16} className="text-slate-400" />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  ['Finance', '42 assets'],
                  ['Operations', '67 assets'],
                  ['HR', '24 assets'],
                ].map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{name}</span>
                    </div>
                    <span className="text-sm text-slate-500">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {/* FIXED: SVG Donut Chart */}
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Asset status</h3>
              <Badge tone="success">Healthy</Badge>
            </div>
            <div className="mt-6 flex flex-col items-center justify-center">
              <div className="relative h-40 w-40">
                {/* SVG Donut Chart */}
                <svg viewBox="0 0 100 100" className="-rotate-90 h-full w-full drop-shadow-md">
                  {/* Background Track (Available) */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="16" />
                  {/* Segment 2 (Allocated - 60%) */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset="100.48" className="transition-all duration-1000 ease-out" />
                  {/* Segment 3 (Maintenance - 15%) */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset="213.52" className="transition-all duration-1000 ease-out" />
                </svg>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">284</span>
                  <span className="text-xs font-medium text-slate-500">Total</span>
                </div>
              </div>
              
              {/* Legend */}
              <div className="mt-6 flex w-full justify-between px-2 text-sm">
                <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-violet-500"></div><span className="text-slate-600">Allocated</span></div>
                <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-emerald-500"></div><span className="text-slate-600">Available</span></div>
                <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-amber-500"></div><span className="text-slate-600">Repair</span></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}