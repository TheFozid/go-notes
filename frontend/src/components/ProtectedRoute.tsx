import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { checkSetup } from '../api/auth';
import useAuthStore from '../store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    async function checkSetupStatus() {
      try {
        const completed = await checkSetup();
        setSetupComplete(completed);
      } catch (error) {
        console.error('Failed to check setup status:', error);
        setSetupComplete(true); // Assume complete on error
      } finally {
        setLoading(false);
      }
    }

    checkSetupStatus();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  // If setup not complete, redirect to setup
  if (setupComplete === false) {
    return <Navigate to="/setup" replace />;
  }

  // If setup complete but not authenticated, redirect to login
if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}

export default ProtectedRoute;
