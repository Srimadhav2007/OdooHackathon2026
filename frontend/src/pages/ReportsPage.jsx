import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, TrendingUp, AlertTriangle, ArrowUpRight, BarChart3, Activity, Clock } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState('This Month');

  // --- Mock Data for Native CSS Charts ---

  // 1. Department Allocation (Horizontal Bar)
  const departmentStats = [
    { name: 'Engineering', count: 145, percentage: 45, color: 'bg-violet-600' },
    { name: 'Operations', count: 89, percentage: 28, color: 'bg-sky-500' },
    { name: 'Finance', count: 45, percentage: 14, color: 'bg-emerald-500' },
    { name: 'HR', count: 24, percentage: 8, color: 'bg-amber-500' },
    { name: 'Unallocated', count: 16, percentage: 5, color: 'bg-slate-300' },
  ];

  // 2. Asset Utilization Trend (Vertical Bar Chart)
  const utilizationTrend = [
    { label: 'Jan', value: 65 }, { label: 'Feb', value: 72 }, { label: 'Mar', value: 68 },
    { label: 'Apr', value: 85 }, { label: 'May', value: 78 }, { label: 'Jun', value: 92 },
    { label: 'Jul', value: 88 }
  ];

  // 3. Maintenance Overview 
  const maintenanceData = [
    { category: 'Laptops', frequency: 'High', upcoming: 12 },
    { category: 'Vehicles', frequency: 'Medium', upcoming: 3 },
    { category: 'Printers', frequency: 'High', upcoming: 5 },
    { category: 'Furniture', frequency: 'Low', upcoming: 0 },
  ];

  // 4. Resource Booking Heatmap (Days x Time slots)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const times = ['9A', '11A', '1P', '3P', '5P'];
  const heatmapData = [
    [20, 40, 80, 60, 30], // Mon
    [30, 60, 90, 70, 40], // Tue
    [50, 80, 100, 80, 50], // Wed
    [40, 70, 80, 60, 30], // Thu
    [30, 50, 40, 30, 10], // Fri
  ];

  const getHeatmapColor = (value) => {
    if (value >= 90) return 'bg-violet-700 text-white';
    if (value >= 70) return 'bg-violet-500 text-white';
    if (value >= 50) return 'bg-violet-300 text-slate-800';
    if (value >= 30) return 'bg-violet-200 text-slate-700';
    return 'bg-violet-50 text-slate-400';
  };

  return (
    <div className="relative mx-auto max-w-7xl pb-12">
      <PageHeader
        eyebrow="Analytics"
        title="Reports & Insights"
        description="Actionable operational insight across asset utilization, maintenance, and resource booking."
        actions={[
          <div key="actions" className="flex items-center gap-3">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600"
            >
              <option>This Week</option>
              <option>This Month</option>
              <option>This Quarter</option>
              <option>This Year</option>
            </select>
            <Button variant="primary">
              <Download size={18} className="mr-2" />
              Export PDF
            </Button>
          </div>
        ]}
      />

      {/* Top Stat Row */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <Activity size={18} />
            <span className="text-sm font-medium">Total Utilization</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">84.2%</p>
            <Badge tone="success" className="mb-1">+2.4%</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <BarChart3 size={18} />
            <span className="text-sm font-medium">Most Used Category</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-xl font-bold text-slate-900">Electronics</p>
            <span className="text-sm font-medium text-violet-600">312 items</span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <TrendingUp size={18} />
            <span className="text-sm font-medium">Idle Assets</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">42</p>
            <Badge tone="error" className="mb-1">Requires action</Badge>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 text-slate-500 mb-2">
            <Clock size={18} />
            <span className="text-sm font-medium">Avg Repair Time</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-900">1.4 <span className="text-lg text-slate-500">days</span></p>
            <Badge tone="success" className="mb-1">-12hrs</Badge>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Department Allocation Summary */}
        <Card className="p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-6">Department-wise Allocation</h3>
          <div className="space-y-5">
            {departmentStats.map((dept) => (
              <div key={dept.name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-700">{dept.name}</span>
                  <span className="text-slate-500">{dept.count} assets ({dept.percentage}%)</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${dept.percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${dept.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Asset Utilization Trend (Native Bar Chart) */}
        <Card className="p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-semibold text-slate-900">Utilization Trend</h3>
            <Badge tone="neutral">YTD 2026</Badge>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2 pt-6">
            {utilizationTrend.map((data, i) => (
              <div key={i} className="flex flex-col items-center flex-1 group">
                {/* Tooltip trigger (mock) */}
                <div className="relative w-full flex justify-center h-48 items-end">
                  <div className="absolute -top-8 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {data.value}%
                  </div>
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${data.value}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className="w-full max-w-[40px] bg-violet-200 rounded-t-lg group-hover:bg-violet-600 transition-colors relative overflow-hidden"
                  >
                    <div className="absolute bottom-0 w-full bg-violet-500 opacity-20" style={{ height: '30%' }}></div>
                  </motion.div>
                </div>
                <span className="text-xs font-medium text-slate-500 mt-3">{data.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Resource Booking Heatmap */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-semibold text-slate-900">Resource Booking Heatmap</h3>
            <span className="text-xs text-slate-500">Peak Usage Windows</span>
          </div>
          <div className="mt-2">
            <div className="flex">
              <div className="w-12"></div> {/* Empty corner */}
              <div className="flex-1 grid grid-cols-5 gap-2">
                {times.map(t => <div key={t} className="text-center text-xs font-medium text-slate-400">{t}</div>)}
              </div>
            </div>
            <div className="mt-2 space-y-2">
              {heatmapData.map((row, rowIndex) => (
                <div key={days[rowIndex]} className="flex items-center">
                  <div className="w-12 text-sm font-medium text-slate-500">{days[rowIndex]}</div>
                  <div className="flex-1 grid grid-cols-5 gap-2">
                    {row.map((val, colIndex) => (
                      <motion.div 
                        key={colIndex}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (rowIndex * 5 + colIndex) * 0.02 }}
                        className={`h-10 rounded-lg flex items-center justify-center text-xs font-medium transition-transform hover:scale-105 cursor-pointer ${getHeatmapColor(val)}`}
                        title={`${val}% capacity`}
                      >
                        {val >= 50 ? `${val}%` : ''}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Maintenance Frequency & Upcoming */}
        <Card className="p-0 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-900">Maintenance Forecast</h3>
            <Button variant="ghost" className="text-xs px-2 py-1">View Schedule <ArrowUpRight size={14} className="ml-1" /></Button>
          </div>
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">Repair Frequency</th>
                <th className="px-6 py-3 font-medium text-right">Due for Maint.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenanceData.map((item) => (
                <tr key={item.category} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{item.category}</td>
                  <td className="px-6 py-4">
                    <Badge tone={item.frequency === 'High' ? 'error' : item.frequency === 'Medium' ? 'warning' : 'success'}>
                      {item.frequency}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.upcoming > 0 ? (
                      <div className="flex items-center justify-end gap-2 text-amber-600 font-medium">
                        <AlertTriangle size={14} />
                        {item.upcoming} items
                      </div>
                    ) : (
                      <span className="text-slate-400">Up to date</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}