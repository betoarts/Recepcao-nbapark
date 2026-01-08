
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PresenceProvider } from './contexts/PresenceContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Toaster } from 'sonner';
import ProtectedRoute from './routes/ProtectedRoute';
import TouchLayout from './components/Layout/TouchLayout';
import Login from './pages/Login';
import ReceptionDashboard from './pages/ReceptionDashboard';
import EmployeeSchedule from './pages/EmployeeSchedule';
import Register from '@/pages/Register';
import Profile from './pages/Profile';
import Departments from './pages/Departments';
import Notifications from './pages/Notifications';
import Chat from './pages/Chat';
import Help from './pages/Help';
import Admin from './pages/Admin';

function App() {
  return (
    <BrowserRouter>
    <AuthProvider>
      <SettingsProvider>
      <PresenceProvider>
      <NotificationProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute />}>
             <Route element={<TouchLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} /> 
                <Route path="/dashboard" element={<ReceptionDashboardWrapper />} />
                <Route path="/schedule" element={<EmployeeSchedule />} />
                <Route path="/employees" element={<ReceptionDashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/departments" element={<Departments />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/help" element={<Help />} />
                {/* Hidden admin route - /sudo */}
                <Route path="/sudo" element={<Admin />} />
             </Route>
          </Route>
        </Routes>
        <Toaster position="top-right" richColors />
      </NotificationProvider>
      </PresenceProvider>
      </SettingsProvider>
    </AuthProvider>
    </BrowserRouter>
  );
}

// Simple wrapper to redirect based on role if hitting root dashboard
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

function ReceptionDashboardWrapper() {
  const { employee, loading } = useAuth();
  
  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  
  if (employee?.role === 'receptionist') {
    return <ReceptionDashboard />;
  } else {
    return <Navigate to="/schedule" replace />;
  }
}

export default App;
