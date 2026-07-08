const roleAliases = Object.freeze({
  ADMIN: "DIRETORIA",
  DIRETORIA: "DIRETORIA",
  RECEPCAO: "RECEPCAO",
  OFICINA: "OFICINA",
  ORCAMENTISTA: "SUPERVISAO",
  SUPERVISAO: "SUPERVISAO",
  OPERACAO: "OPERACAO",
});

const ROLE_LABELS = Object.freeze({
  DIRETORIA: "Diretoria",
  RECEPCAO: "Recepcao",
  OFICINA: "Oficina",
  SUPERVISAO: "Supervisao",
  OPERACAO: "Operacao",
  ADMIN: "Diretoria",
  ORCAMENTISTA: "Supervisao",
});

const DIRECTOR_ROLES = Object.freeze(["DIRETORIA"]);
const APP_ACCESS_ROLES = Object.freeze(["DIRETORIA", "RECEPCAO", "OFICINA", "SUPERVISAO"]);
const OPERATION_ACCESS_ROLES = Object.freeze(["DIRETORIA", "RECEPCAO", "OFICINA", "SUPERVISAO", "OPERACAO"]);
const MANAGED_PASSWORD_ROLES = Object.freeze(["RECEPCAO", "OFICINA", "SUPERVISAO", "OPERACAO"]);

function normalizeRole(role) {
  const normalizedRole = String(role || "").trim().toUpperCase();
  return roleAliases[normalizedRole] || normalizedRole;
}

function hasAllowedRole(role, allowedRoles = []) {
  const normalizedRole = normalizeRole(role);
  return allowedRoles.some((allowedRole) => normalizeRole(allowedRole) === normalizedRole);
}

function getRoleLabel(role) {
  return ROLE_LABELS[normalizeRole(role)] || ROLE_LABELS[role] || role;
}

export {
  APP_ACCESS_ROLES,
  DIRECTOR_ROLES,
  MANAGED_PASSWORD_ROLES,
  OPERATION_ACCESS_ROLES,
  getRoleLabel,
  hasAllowedRole,
  normalizeRole,
};
