import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="departments" element={<PlaceholderPage title="Departments" />} />
        <Route path="employees" element={<PlaceholderPage title="Employees" />} />
        <Route path="categories" element={<PlaceholderPage title="Categories" />} />
        <Route path="assets" element={<PlaceholderPage title="Assets" />} />
        <Route path="allocations" element={<PlaceholderPage title="Allocation" />} />
        <Route path="bookings" element={<PlaceholderPage title="Bookings" />} />
        <Route path="maintenance" element={<PlaceholderPage title="Maintenance" />} />
        <Route path="audits" element={<PlaceholderPage title="Audits" />} />
        <Route path="reports" element={<PlaceholderPage title="Reports" />} />
        <Route path="notifications" element={<PlaceholderPage title="Notifications" />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
