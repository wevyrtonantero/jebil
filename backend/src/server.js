const http = require("http");
const app = require("./app");
const { port, frontendUrl } = require("./config/env");
const { initSocket } = require("./sockets");
const { startOrderRetentionScheduler } = require("./services/orderRetentionService");

const server = http.createServer(app);

initSocket(server, {
  frontendUrl,
});

server.listen(port, () => {
  console.log(`jebil-backend rodando na porta ${port}`);
  startOrderRetentionScheduler();
});
