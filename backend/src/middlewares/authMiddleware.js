const { verifyAccessToken } = require("../config/jwt");
const { ApiError } = require("../utils/ApiError");
const usuarioRepository = require("../repositories/usuarioRepository");

async function authMiddleware(req, _res, next) {
  try {
    const authorization = req.headers.authorization || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new ApiError(401, "Token de acesso ausente.");
    }

    const payload = verifyAccessToken(token);
    const user = await usuarioRepository.findById(payload.sub);

    if (!user) {
      throw new ApiError(401, "Usuario autenticado nao encontrado.");
    }

    if (!user.ativo) {
      throw new ApiError(403, "Usuario inativo nao pode acessar o sistema.");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      next(new ApiError(401, "Token expirado."));
      return;
    }

    if (error.name === "JsonWebTokenError") {
      next(new ApiError(401, "Token invalido."));
      return;
    }

    next(error);
  }
}

module.exports = {
  authMiddleware,
};
