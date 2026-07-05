import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { SocketProvider } from "../contexts/SocketContext";
import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import ClientesPage from "../pages/ClientesPage";
import MecanicosPage from "../pages/MecanicosPage";
import RecepcaoV2Page from "../pages/RecepcaoV2Page";
import RecepcaoFotosPage from "../pages/RecepcaoFotosPage";
import OficinaAdminPage from "../pages/OficinaAdminPage";
import OperacaoV2Page from "../pages/OperacaoV2Page";
import OrcamentistaV2Page from "../pages/OrcamentistaV2Page";
import PasswordManagementPage from "../pages/PasswordManagementPage";
import ProntuarioV2Page from "../pages/ProntuarioV2Page";
import AccessDeniedPage from "../pages/AccessDeniedPage";
import NotFoundPage from "../pages/NotFoundPage";
import { getDefaultRouteByRole } from "../utils/roleRoutes";
import { APP_ACCESS_ROLES, DIRECTOR_ROLES } from "../utils/roles";
import { useAuth } from "../hooks/useAuth";

function HomeRedirect() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="center-message">Carregando sessao...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteByRole(user?.perfil)} replace />;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/acesso-negado" element={<AccessDeniedPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route element={<RoleRoute allowedRoles={DIRECTOR_ROLES} />}>
                  <Route path="/senhas" element={<PasswordManagementPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                </Route>

                <Route element={<RoleRoute allowedRoles={APP_ACCESS_ROLES} />}>
                  <Route path="/clientes" element={<ClientesPage />} />
                  <Route path="/mecanicos" element={<MecanicosPage />} />
                  <Route path="/recepcao" element={<RecepcaoV2Page />} />
                  <Route path="/recepcao/fotos" element={<RecepcaoFotosPage />} />
                  <Route path="/introducao" element={<Navigate to="/recepcao" replace />} />
                  <Route path="/v2/recepcao" element={<Navigate to="/recepcao" replace />} />
                  <Route path="/oficina" element={<OficinaAdminPage />} />
                  <Route path="/v2/operacao" element={<OperacaoV2Page />} />
                  <Route path="/v2/prontuario" element={<ProntuarioV2Page />} />
                  <Route path="/v2/orcamentos" element={<OrcamentistaV2Page />} />
                </Route>

              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppRouter;
