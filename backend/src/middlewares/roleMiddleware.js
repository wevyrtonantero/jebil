const { ApiError } = require("../utils/ApiError");
const { hasAllowedRole } = require("../utils/roles");

function roleMiddleware(allowedRoles) {
  return function handleRole(req, _res, next) {
    if (!req.user) {
      next(new ApiError(401, "Usuario nao autenticado."));
      return;
    }

    if (!hasAllowedRole(req.user.perfil, allowedRoles)) {
      next(new ApiError(403, "Voce nao tem permissao para esta operacao."));
      return;
    }

    next();
  };
}

module.exports = {
  roleMiddleware,
};
