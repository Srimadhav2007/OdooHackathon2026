import {
  Activity,
  AlertTriangle,
  Boxes,
  CalendarClock,
  ClipboardList,
  FileBarChart2,
  LayoutGrid,
  MessageSquareMore,
  ShieldCheck,
  Users,
  Warehouse,
} from 'lucide-react';

export const navigationItems = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    ],
  },
  {
    title: 'Organization',
    items: [
      { label: 'Departments', path: '/departments', icon: Warehouse },
      { label: 'Employees', path: '/employees', icon: Users },
      { label: 'Categories', path: '/categories', icon: Boxes },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Assets', path: '/assets', icon: ShieldCheck },
      { label: 'Allocation', path: '/allocations', icon: ClipboardList },
      { label: 'Bookings', path: '/bookings', icon: CalendarClock },
      { label: 'Maintenance', path: '/maintenance', icon: AlertTriangle },
      { label: 'Audits', path: '/audits', icon: Activity },
      { label: 'Reports', path: '/reports', icon: FileBarChart2 },
      { label: 'Notifications', path: '/notifications', icon: MessageSquareMore },
    ],
  },
];
