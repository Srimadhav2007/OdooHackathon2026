import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';

// Auth pages
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';

// App pages
import DashboardPage from './pages/Dashboard/DashboardPage';
import OrgSetupPage from './pages/OrgSetup/OrgSetupPage';
import AssetsPage from './pages/Assets/AssetsPage';
import AllocationsPage from './pages/Allocations/AllocationsPage';
import BookingsPage from './pages/Bookings/BookingsPage';
import MaintenancePage from './pages/Maintenance/MaintenancePage';
import AuditsPage from './pages/Audits/AuditsPage';
import ReportsPage from './pages/Reports/ReportsPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';

// Route guard: redirect to login if not authenticated
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

// Role guard: redirect if user doesn't have required role
function RoleRoute({ children, roles }) {
  const { user } = useAuth();
  if (!roles.includes(user?.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected routes inside AppShell (sidebar + topbar) */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route
          path="org-setup"
          element={
            <RoleRoute roles={['ADMIN']}>
              <OrgSetupPage />
            </RoleRoute>
          }
        />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="allocations" element={<AllocationsPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route
          path="audits"
          element={
            <RoleRoute roles={['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD']}>
              <AuditsPage />
            </RoleRoute>
          }
        />
        <Route
          path="reports"
          element={
            <RoleRoute roles={['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD']}>
              <ReportsPage />
            </RoleRoute>
          }
        />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
