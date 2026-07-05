const roleAliases = Object.freeze({
  ADMIN: "DIRETORIA",
  DIRETORIA: "DIRETORIA",
  RECEPCAO: "RECEPCAO",
  OFICINA: "OFICINA",
  ORCAMENTISTA: "SUPERVISAO",
  SUPERVISAO: "SUPERVISAO",
});

const perfisDiretoria = Object.freeze(["DIRETORIA"]);
const perfisAplicacao = Object.freeze(["DIRETORIA", "RECEPCAO", "OFICINA", "SUPERVISAO"]);
const perfisGerenciadosPorDiretoria = Object.freeze(["RECEPCAO", "OFICINA", "SUPERVISAO"]);

function normalizeRole(role) {
  const normalizedRole = String(role || "").trim().toUpperCase();
  return roleAliases[normalizedRole] || normalizedRole;
}

function hasAllowedRole(userRole, allowedRoles = []) {
  const normalizedUserRole = normalizeRole(userRole);

  return allowedRoles.some((allowedRole) => normalizeRole(allowedRole) === normalizedUserRole);
}

function buildRoleLookupCandidates(role) {
  const normalizedRole = normalizeRole(role);
  const candidates = new Set([normalizedRole]);

  if (normalizedRole === "DIRETORIA") {
    candidates.add("ADMIN");
  }

  if (normalizedRole === "SUPERVISAO") {
    candidates.add("ORCAMENTISTA");
  }

  return [...candidates];
}

module.exports = {
  normalizeRole,
  hasAllowedRole,
  buildRoleLookupCandidates,
  perfisDiretoria,
  perfisAplicacao,
  perfisGerenciadosPorDiretoria,
};
