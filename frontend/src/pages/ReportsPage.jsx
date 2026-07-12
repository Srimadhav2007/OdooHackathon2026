import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  // Dynamic Data based on Time Range
  const dataSets = {
    'This Week': { util: '81.5%', trend: [50, 60, 55, 70, 65, 80, 81], idle: 12, repair: '1.2' },
    'This Month': { util: '84.2%', trend: [65, 72, 68, 85, 78, 92, 88], idle: 42, repair: '1.4' },
    'This Quarter': { util: '88.1%', trend: [70, 75, 80, 82, 85, 88, 90], idle: 28, repair: '1.8' },
  };

  const currentData = dataSets[timeRange] || dataSets['This Month'];

  const departmentStats = [
    { name: 'Engineering', count: 145, percentage: 45, color: 'bg-violet-600' },
    { name: 'Operations', count: 89, percentage: 28, color: 'bg-sky-500' },
    { name: 'Finance', count: 45, percentage: 14, color: 'bg-emerald-500' },
  ];

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
            <Button variant="primary" onClick={() => triggerToast('Generating PDF Report... Download starting.')}>
              <Download size={18} className="mr-2" /> Export PDF
            </Button>
          </div>
        ]}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-3 text-slate-500"><Activity size={18} /><span className="text-sm font-medium">Total Utilization</span></div>
          <p className="text-3xl font-bold text-slate-900">{currentData.util}</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-3 text-slate-500"><TrendingUp size={18} /><span className="text-sm font-medium">Idle Assets</span></div>
          <p className="text-3xl font-bold text-slate-900">{currentData.idle}</p>
        </Card>
        <Card className="p-5">
          <div className="mb-2 flex items-center gap-3 text-slate-500"><Clock size={18} /><span className="text-sm font-medium">Avg Repair Time</span></div>
          <p className="text-3xl font-bold text-slate-900">{currentData.repair} <span className="text-lg text-slate-500">days</span></p>
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
            <thead className="bg-slate-50/50 text-xs uppercase text-slate-500"><tr><th className="px-6 py-3 font-medium">Category</th><th className="px-6 py-3 font-medium text-right">Due for Maint.</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50"><td className="px-6 py-4 font-medium text-slate-900">Laptops</td><td className="px-6 py-4 text-right text-amber-600 font-medium">12 items</td></tr>
              <tr className="hover:bg-slate-50"><td className="px-6 py-4 font-medium text-slate-900">Vehicles</td><td className="px-6 py-4 text-right text-amber-600 font-medium">3 items</td></tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}