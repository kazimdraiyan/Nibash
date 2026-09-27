import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function VerifyPortalPage() {
  const { user } = useAuth();

  if (user && !user.is_verifier) {
    return <Navigate to="/listings" replace />;
  }

  return <Navigate to="/verify/dashboard" replace />;
}

