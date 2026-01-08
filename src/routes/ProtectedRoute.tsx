
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated but has no employee profile yet, maybe redirect to a setup page?
  // For now, we'll allow but perhaps show a warning if accessing role-specific routes.
  // Actually, if 'employee' is null, it means no profile found.
  
  if (allowedRoles && employee && !allowedRoles.includes(employee.role)) {
    // Role not authorized
    return <Navigate to="/" replace />; // Or unauthorized page
  }

  if (employee && (employee.account_status === 'blocked' || employee.account_status === 'paused')) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
