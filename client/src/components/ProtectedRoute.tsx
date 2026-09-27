import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  blockVerifier?: boolean;
}

export function ProtectedRoute({ children, blockVerifier }: ProtectedRouteProps) {
  const { token, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center bg-[#090a0c] text-white">
        <div className="w-10 h-10 rounded-full border-2 border-white/60 border-t-transparent animate-spin mb-4" />
        <span className="text-xs uppercase tracking-[0.2em] text-[#cbd5e1] font-label-sm">
          Verifying credentials...
        </span>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (blockVerifier && user?.is_verifier) {
    return <Navigate to="/verify/dashboard" replace />;
  }

  return <>{children}</>;
}
