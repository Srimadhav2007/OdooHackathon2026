import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  ClipboardList,
  PackageCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';

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

const returns = [
  { title: 'Dell Latitude 5410', employee: 'Mina Shah', date: 'Jul 15' },
  { title: 'Projector MX100', employee: 'Daniel Kim', date: 'Jul 16' },
];

const notifications = [
  { title: 'New booking request', detail: 'Marketing requested 6 devices', tone: 'info' },
  { title: 'Asset transfer pending', detail: 'HR transfer needs approval', tone: 'warning' },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Overview"
        title="Welcome back, Admin"
        description="A calm view of your asset operations across departments."
        actions={[
          <Button key="1" variant="primary">+ New booking</Button>,
          <Button key="2" variant="secondary">Export report</Button>,
        ]}
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <StatCard key={item.title} {...item} />
        ))}
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
                    <div className="rounded-full bg-white p-2 text-slate-600 shadow-sm">
                      <Sparkles size={16} />
                    </div>
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
                <Button variant="ghost" className="px-3 py-2">View all</Button>
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
                <h3 className="text-base font-semibold text-slate-900">Upcoming returns</h3>
                <Button variant="ghost" className="px-3 py-2">Manage</Button>
              </div>
              <div className="mt-4 space-y-3">
                {returns.map((item) => (
                  <div key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <Badge tone="info">{item.date}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{item.employee}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Asset status</h3>
              <Badge tone="success">Healthy</Badge>
            </div>
            <div className="mt-6 flex h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50">
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                  <ClipboardList size={24} />
                </div>
                <p className="mt-3 text-sm font-medium text-slate-600">Pie chart placeholder</p>
              </div>
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
                ['IT', '58 assets'],
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

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Recent notifications</h3>
              <Badge tone="neutral">3 new</Badge>
            </div>
            <div className="mt-4 space-y-3">
              {notifications.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800">{item.title}</p>
                    <Badge tone={item.tone === 'warning' ? 'warning' : 'info'}>{item.tone}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}