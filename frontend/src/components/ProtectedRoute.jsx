import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { detectAuto } from "../hooks/useDeviceMode";

const IPAD_ALLOWED_ROUTES = ["/reparations"];

export default function ProtectedRoute({ children, ipadAllowed = false }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const isIpad = detectAuto() === "ipad";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#84CC16]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Sur iPad, restreindre aux routes autorisées (sécurité supplémentaire si Guided Access oublié)
  if (isIpad && !ipadAllowed) {
    const path = location.pathname;
    const allowed = IPAD_ALLOWED_ROUTES.some((p) => path === p || path.startsWith(p + "/"));
    if (!allowed) return <Navigate to="/reparations" replace />;
  }

  return children;
}
