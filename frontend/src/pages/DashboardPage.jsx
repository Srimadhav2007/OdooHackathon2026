import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight, Boxes, CalendarClock, PackageCheck, Sparkles, Users, CheckCircle } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [stats, setStats] = useState({
    assetsAvailable: 0,
    assetsAllocated: 0,
    maintenanceToday: 0,
    activeBookings: 0,
  });
  const [deptStats, setDeptStats] = useState([]);
  const [activities, setActivities] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashRes, allocStatsRes, notifRes, maintRes] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get('/reports/departments'),
          api.get('/notifications'),
          api.get('/maintenance'),
        ]);
        setStats(dashRes.data);
        setDeptStats(allocStatsRes.data);

        if (notifRes.data) {
          setNotifications(notifRes.data.slice(0, 3).map(n => ({
            title: n.title, detail: n.message, tone: n.type === 'ALERT' ? 'warning' : 'info'
          })));
          setActivities(notifRes.data.slice(0, 4).map(n => ({
            title: n.title, time: new Date(n.createdAt).toLocaleDateString(), tone: n.type === 'ALERT' ? 'warning' : 'success'
          })));
        }

        if (maintRes.data) {
          setMaintenance(maintRes.data.filter(m => m.status === 'PENDING').slice(0, 3).map(m => ({
            title: m.asset?.name || 'Asset', due: 'Pending', owner: m.raisedBy?.name || 'Unknown'
          })));
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const kpis = [
    { title: 'Assets Available', value: stats.assetsAvailable, change: 'Ready for use', icon: Boxes, tone: 'violet' },
    { title: 'Allocated', value: stats.assetsAllocated, change: 'Currently assigned', icon: PackageCheck, tone: 'emerald' },
    { title: 'Maintenance', value: stats.maintenanceToday, change: 'Raised today', icon: AlertTriangle, tone: 'amber' },
    { title: 'Bookings', value: stats.activeBookings, change: 'Active', icon: CalendarClock, tone: 'sky' },
  ];

  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000); // Auto-hide after 3 seconds
  };

  const totalAssets = stats.assetsAvailable + stats.assetsAllocated;
  const C = 251.2;
  const allocatedPct = totalAssets ? (stats.assetsAllocated / totalAssets) : 0;
  
  const layer1Offset = C - (allocatedPct * C);
  const layer2Offset = C;

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
        title={`Welcome back, ${user?.name || 'User'}`}
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
              {activities.map((item, index) => (
                <div key={item.title + index} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
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
                {maintenance.map((item, index) => (
                  <div key={item.title + index} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
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
                {deptStats.slice(0, 4).map((dept, index) => (
                  <div key={dept.department || index} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{dept.department || 'Unknown'}</span>
                    </div>
                    <span className="text-sm text-slate-500">{dept.totalAssets || 0} assets</span>
                  </div>
                ))}
                {deptStats.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No data available</p>}
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
                  {/* Layer 1 (Allocated + Maintenance) */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset={layer1Offset} className="transition-all duration-1000 ease-out" />
                  {/* Layer 2 (Maintenance) */}
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="16" strokeDasharray="251.2" strokeDashoffset={layer2Offset} className="transition-all duration-1000 ease-out" />
                </svg>
                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">{totalAssets}</span>
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