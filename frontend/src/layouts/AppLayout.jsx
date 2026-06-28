import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import AppIcon from "../components/common/AppIcon";

function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuHidden, setMenuHidden] = useState(false);
  const isAdmin = user?.perfil === "ADMIN";
  const canUseRecepcao = ["ADMIN", "RECEPCAO"].includes(user?.perfil);
  const canUseOperacaoV2 = ["ADMIN", "OFICINA", "ORCAMENTISTA", "RECEPCAO"].includes(user?.perfil);
  const canUseProntuarioV2 = ["ADMIN", "RECEPCAO", "OFICINA", "ORCAMENTISTA"].includes(user?.perfil);
  const canUseOrcamentosV2 = ["ADMIN", "ORCAMENTISTA"].includes(user?.perfil);
  const canUseOficina = ["ADMIN", "OFICINA"].includes(user?.perfil);
  const canUsePainelClientes = ["ADMIN", "RECEPCAO", "OFICINA", "ORCAMENTISTA"].includes(user?.perfil);
  const isTvRoute = location.pathname === "/oficina";
  const isImmersiveOperationRoute = location.pathname === "/v2/operacao";
  const isPhotoCaptureRoute = location.pathname === "/recepcao/fotos";
  const roleLabel = {
    ADMIN: "Administrador",
    RECEPCAO: "Recepcao",
    OFICINA: "Oficina",
    ORCAMENTISTA: "Orcamentista",
  };
  const displayName = roleLabel[user?.perfil] || user?.nome;
  const navigationItems = [
    { to: "/dashboard", label: "Visao geral", icon: "board", show: isAdmin },
    { to: "/recepcao", label: "Recepcao", icon: "reception", show: canUseRecepcao },
    { to: "/recepcao/fotos", label: "Fotos", icon: "camera", show: canUseRecepcao },
    { to: "/oficina", label: "Oficina", icon: "workshop", show: canUseOficina },
    { to: "/v2/operacao", label: "Operacao", icon: "workshop", show: canUseOperacaoV2 },
    { to: "/v2/orcamentos", label: "Orcamentos", icon: "money", show: canUseOrcamentosV2 },
    { to: "/v2/prontuario", label: "Prontuario", icon: "motorcycle", show: canUseProntuarioV2 },
    { to: "/mecanicos", label: "Mecanicos", icon: "mechanic", show: isAdmin },
    { to: "/clientes", label: "Clientes", icon: "clients", show: canUseRecepcao },
    { to: "/senhas", label: "Senhas", icon: "settings", show: Boolean(user) },
    { to: "/painel/clientes", label: "Painel clientes", icon: "clock", show: canUsePainelClientes },
  ];
  const pageTitle =
    [...navigationItems]
      .sort((first, second) => second.to.length - first.to.length)
      .find((item) => location.pathname.startsWith(item.to) && item.to !== "/dashboard")?.label ||
    "Sistema";

  if (isTvRoute || isImmersiveOperationRoute || isPhotoCaptureRoute) {
    return (
      <main className={isPhotoCaptureRoute ? "photo-route-shell" : "tv-route-shell"}>
        <Outlet />
      </main>
    );
  }

  return (
    <div className={`app-shell ${menuHidden ? "app-shell-menu-hidden" : ""}`}>
      <aside className={`sidebar ${menuHidden ? "hidden" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-mark">JB</span>
            <div className="brand-copy">
              <strong>Jebil Motos</strong>
              <p>Atendimento em fluxo</p>
            </div>
          </div>
        </div>

        <div className="dashboard-mini">
          <span className="eyebrow">Sessao ativa</span>
          <strong>{roleLabel[user?.perfil] || user?.perfil}</strong>
          <p>{displayName}</p>
        </div>

        <nav className="nav-list">
          {navigationItems
            .filter((item) => item.show)
            .map((item) => (
              <NavLink key={item.to} to={item.to} className="nav-link">
                <AppIcon name={item.icon} className="nav-link-icon" />
                <span>{item.label}</span>
              </NavLink>
            ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="ghost-button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="app-topbar">
          <div>
            <p className="eyebrow">Operacao</p>
            <h1>{pageTitle}</h1>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => setMenuHidden((current) => !current)}
              aria-label={menuHidden ? "Mostrar menu" : "Ocultar menu"}
            >
              <AppIcon name="menu" />
            </button>
            <button type="button" className="icon-button">
              <AppIcon name="bell" />
            </button>
            <div className="topbar-user">
              <span className="topbar-avatar">
                <AppIcon name="user" size={18} />
              </span>
              <div>
                <strong>{displayName}</strong>
                <small>{roleLabel[user?.perfil] || user?.perfil}</small>
              </div>
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

export default AppLayout;
