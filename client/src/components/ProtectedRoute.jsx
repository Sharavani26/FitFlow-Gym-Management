import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './ui/Spinner';

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400">
        <Spinner size={32} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="mt-2 text-slate-500">Your role does not have permission to view this page.</p>
      </div>
    );
  }
  return children;
}