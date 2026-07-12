import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import OrgSetupPage from './pages/OrgSetupPage'; // We will create this below
import PlaceholderPage from './pages/PlaceholderPage';
import AssetDirectoryPage from './pages/AssetDirectoryPage';
import AllocationPage from './pages/AllocationPage';
import BookingPage from './pages/BookingPage';
import MaintenancePage from './pages/MaintenancePage';
import AuditPage from './pages/AuditPage';
import ReportsPage from './pages/ReportsPage';
import ActivityPage from './pages/ActivityPage';
import { useState } from 'react';

// Basic Auth Guard
const RequireAuth = ({ children, isAuthenticated }) => {
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Role-Based Guard (Admin Only)
const RequireAdmin = ({ children, userRole }) => {
  return userRole === 'Admin' ? children : <Navigate to="/dashboard" replace />;
};

export default function App() {
  // ⚠️ DUMMY BYPASS: Hardcoded to true and 'Admin' so you can see the tabs!
  // REMINDER: Change these back to `false` and `null` before your final submission.
  const [isAuthenticated, setIsAuthenticated] = useState(true); 
  const [userRole, setUserRole] = useState('Admin'); 

  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={
        <AuthPage onLogin={() => {
          setIsAuthenticated(true);
          setUserRole('Admin'); // Just for testing the UI flow
        }} />
      } />

      {/* Protected Routes (Requires Login) */}
      <Route path="/" element={
        <RequireAuth isAuthenticated={isAuthenticated}>
          <AppShell />
        </RequireAuth>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* ADMIN ONLY ROUTES: The 3-Tab Organization Setup */}
        <Route path="departments" element={
          <RequireAdmin userRole={userRole}>
            <OrgSetupPage defaultTab="departments" />
          </RequireAdmin>
        } />
        <Route path="employees" element={
          <RequireAdmin userRole={userRole}>
            <OrgSetupPage defaultTab="employees" />
          </RequireAdmin>
        } />
        <Route path="categories" element={
          <RequireAdmin userRole={userRole}>
            <OrgSetupPage defaultTab="categories" />
          </RequireAdmin>
        } />

        {/* Other Application Routes */}
        <Route path="assets" element={<AssetDirectoryPage />} />
        <Route path="allocations" element={<AllocationPage />} />
        <Route path="bookings" element={<BookingPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="audits" element={<AuditPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notifications" element={<ActivityPage />} />
      </Route>
      
      {/* Catch-all */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}