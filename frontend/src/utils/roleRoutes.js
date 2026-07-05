import { normalizeRole } from "./roles";

function getDefaultRouteByRole(perfil) {
  const normalizedRole = normalizeRole(perfil);

  if (normalizedRole === "SUPERVISAO") {
    return "/v2/orcamentos";
  }

  if (normalizedRole === "OFICINA") {
    return "/oficina";
  }

  if (normalizedRole === "RECEPCAO") {
    return "/recepcao";
  }

  return "/dashboard";
}

export { getDefaultRouteByRole };
