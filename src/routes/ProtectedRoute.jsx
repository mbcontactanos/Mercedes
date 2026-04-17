import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppContext } from "../context/useAppContext.js";

export default function ProtectedRoute() {
  const { authReady, isAuthenticated } = useAppContext();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-sm text-[#495057]">
        Cargando sesion...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <Outlet />;
}
