let ioInstance = null;

function initSocket(server, options = {}) {
  const { Server } = require("socket.io");
  const { verifyAccessToken } = require("../config/jwt");
  const usuarioRepository = require("../repositories/usuarioRepository");

  ioInstance = new Server(server, {
    cors: {
      origin: options.frontendUrl,
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      socket.data.user = null;
      next();
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      const user = await usuarioRepository.findById(payload.sub);

      if (!user || !user.ativo) {
        next(new Error("Usuario do socket invalido."));
        return;
      }

      socket.data.user = user;
      next();
    } catch (_error) {
      next(new Error("Token de socket invalido."));
    }
  });

  ioInstance.on("connection", (socket) => {
    socket.on("disconnect", () => {});
  });

  return ioInstance;
}

function getIo() {
  return ioInstance;
}

function emitSocketEvent(eventName, payload = {}) {
  if (!ioInstance) {
    return;
  }

  ioInstance.emit(eventName, payload);
}

module.exports = {
  initSocket,
  getIo,
  emitSocketEvent,
};
