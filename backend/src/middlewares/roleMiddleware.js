const { ApiError } = require("../utils/ApiError");

function roleMiddleware(allowedRoles) {
  return function handleRole(req, _res, next) {
    if (!req.user) {
      next(new ApiError(401, "Usuario nao autenticado."));
      return;
    }

    if (!allowedRoles.includes(req.user.perfil)) {
      next(new ApiError(403, "Voce nao tem permissao para esta operacao."));
      return;
    }

    next();
  };
}

module.exports = {
  roleMiddleware,
};
