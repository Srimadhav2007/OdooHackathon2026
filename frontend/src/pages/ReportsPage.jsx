import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { Download, TrendingUp, AlertTriangle, ArrowUpRight, BarChart3, Activity, Clock, CheckCircle } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState('This Month');
  const [toastMessage, setToastMessage] = useState('');
  const navigate = useNavigate();

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const [stats, setStats] = useState({
    utilization: 0,
    idleAssets: 0,
    avgRepairDays: 0,
    maintenanceForecast: [],
    departmentStats: []
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [kpisRes, maintRes, deptRes] = await Promise.all([
        api.get('/reports/kpis'),
        api.get('/reports/maintenance'),
        api.get('/reports/allocations')
      ]);
      
      const { assetsAvailable, assetsAllocated } = kpisRes.data || {};
      const total = (assetsAvailable || 0) + (assetsAllocated || 0);
      const util = total > 0 ? ((assetsAllocated / total) * 100).toFixed(1) : 0;
      
      const maintData = maintRes.data || [];
      const totalHours = maintData.reduce((acc, curr) => acc + (curr.avgResolutionHours || 0), 0);
      const avgDays = maintData.length > 0 ? (totalHours / maintData.length / 24).toFixed(1) : 0;

      setStats({
        utilization: util,
        idleAssets: assetsAvailable || 0,
        avgRepairDays: avgDays,
        maintenanceForecast: maintData,
        departmentStats: deptRes.data || []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  // Mock trend data for chart display purposes
  const currentData = { trend: [65, 72, 68, 85, 78, 92, 88] };

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
        eyebrow="Analytics"
        title="Reports & Insights"
        actions={[
          <div key="actions" className="flex items-center gap-3">
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
              <option>This Week</option><option>This Month</option><option>This Quarter</option>
            </select>
            <Button variant="primary" onClick={() => window.print()}>
              <Download size={18} className="mr-2" /> Export PDF
            </Button>
          </div>
        ]}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-3 text-slate-500"><Activity size={18} /><span className="text-sm font-medium">Total Utilization</span></div>
          <p className="text-3xl font-bold text-slate-900">{loading ? '-' : `${stats.utilization}%`}</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-3 text-slate-500"><TrendingUp size={18} /><span className="text-sm font-medium">Idle Assets</span></div>
          <p className="text-3xl font-bold text-slate-900">{loading ? '-' : stats.idleAssets}</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-3 text-slate-500"><Clock size={18} /><span className="text-sm font-medium">Avg Repair Time</span></div>
          <p className="text-3xl font-bold text-slate-900">{loading ? '-' : stats.avgRepairDays} <span className="text-lg text-slate-500">days</span></p>
        </Card>
        <Card className="p-6">
          <h3 className="mb-6 text-base font-semibold text-slate-900">Allocation by Department</h3>
          <div className="space-y-5">
            {loading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : stats.departmentStats.length === 0 ? (
              <div className="text-sm text-slate-500">No department data</div>
            ) : (
              stats.departmentStats.map((dept, idx) => {
                const colors = ['bg-violet-600', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
                const color = colors[idx % colors.length];
                const percentage = stats.utilization > 0 && dept.totalAssets > 0 ? ((dept.totalAssets / (stats.utilization / 100 * (stats.idleAssets + dept.totalAssets))) * 100).toFixed(0) : 0; // rough percentage
                return (
                  <div key={idx}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-medium text-slate-900">{dept.departmentName}</span><span className="text-slate-500">{dept.totalAssets} items</span></div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(10, (dept.totalAssets / 200) * 100))}%` }}></div></div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col p-6">
          <div className="mb-6 flex items-center justify-between"><h3 className="text-base font-semibold text-slate-900">Utilization Trend</h3><Badge tone="neutral">{timeRange}</Badge></div>
          <div className="flex flex-1 items-end justify-between gap-2 pt-6">
            {currentData.trend.map((val, i) => (
              <div key={i} className="group relative flex h-48 w-full flex-col items-center justify-end">
                <motion.div initial={{ height: 0 }} animate={{ height: `${val}%` }} transition={{ duration: 0.8 }} className="relative w-full max-w-[40px] overflow-hidden rounded-t-lg bg-violet-200 transition-colors group-hover:bg-violet-600">
                  <div className="absolute bottom-0 w-full bg-violet-500 opacity-20" style={{ height: '30%' }}></div>
                </motion.div>
              </div>
            ))}
          </div>
        </Card>
        
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-100 p-6">
            <h3 className="text-base font-semibold text-slate-900">Maintenance Forecast</h3>
            <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => navigate('/maintenance')}>View Schedule <ArrowUpRight size={14} className="ml-1" /></Button>
          </div>
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3 font-medium">Category</th><th className="px-6 py-3 font-medium text-right">Maint. Tickets</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="2" className="px-6 py-4 text-center text-slate-500">Loading...</td></tr>
              ) : stats.maintenanceForecast.length === 0 ? (
                <tr><td colSpan="2" className="px-6 py-4 text-center text-slate-500">No maintenance data</td></tr>
              ) : (
                stats.maintenanceForecast.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.category}</td>
                    <td className="px-6 py-4 text-right text-amber-600 font-medium">{item.count} items</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}