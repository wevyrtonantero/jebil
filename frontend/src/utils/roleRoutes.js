function getDefaultRouteByRole(perfil) {
  if (perfil === "ORCAMENTISTA") {
    return "/v2/orcamentos";
  }

  if (perfil === "OFICINA") {
    return "/oficina";
  }

  if (perfil === "RECEPCAO") {
    return "/recepcao";
  }

  return "/dashboard";
}

export { getDefaultRouteByRole };
