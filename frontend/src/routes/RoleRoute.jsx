import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function RoleRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.perfil)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
