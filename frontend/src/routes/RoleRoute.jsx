import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { hasAllowedRole } from "../utils/roles";

function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user || !hasAllowedRole(user.perfil, allowedRoles)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
