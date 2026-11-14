import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth, type UserRole } from '../../context/AuthContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, isLoading, user, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#060A09',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          color: '#00E599',
          fontFamily: 'monospace',
        }}
      >
        <Loader2 className="animate-spin" size={36} />
        <span style={{ fontSize: 13, letterSpacing: '0.1em' }}>
          VERIFYING ENCRYPTED SESSION CREDENTIALS...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#060A09',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          color: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#EF4444',
            marginBottom: 20,
          }}
        >
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Access Restricted (403 Forbidden)</h2>
        <p style={{ fontSize: 14, color: '#8E9E97', maxWidth: 460, margin: '0 0 24px' }}>
          Your active account role (<span style={{ color: '#00E599', fontFamily: 'monospace' }}>{user?.role}</span>) does not possess authorization privileges required for this operational tier.
        </p>
        <a
          href="/app"
          style={{
            background: '#00E599',
            color: '#000000',
            fontWeight: 800,
            padding: '10px 24px',
            borderRadius: 12,
            textDecoration: 'none',
            fontSize: 13,
          }}
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
