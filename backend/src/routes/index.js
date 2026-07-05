const { Router } = require("express");
const healthRoutes = require("./healthRoutes");
const authRoutes = require("./authRoutes");
const clienteRoutes = require("./clienteRoutes");
const motocicletaRoutes = require("./motocicletaRoutes");
const mecanicoRoutes = require("./mecanicoRoutes");
const atendimentoRoutes = require("./atendimentoRoutes");
const ordemServicoV2Routes = require("./ordemServicoV2Routes");
const painelRoutes = require("./painelRoutes");
const relatorioRoutes = require("./relatorioRoutes");
const { listMotocicletasByCliente } = require("../controllers/motocicletaController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddleware");
const { perfisAplicacao } = require("../utils/roles");

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.get(
  "/clientes/:clienteId/motocicletas",
  authMiddleware,
  roleMiddleware(perfisAplicacao),
  listMotocicletasByCliente,
);
router.use("/clientes", clienteRoutes);
router.use("/motocicletas", motocicletaRoutes);
router.use("/mecanicos", mecanicoRoutes);
router.use("/atendimentos", atendimentoRoutes);
router.use("/v2/ordens-servico", ordemServicoV2Routes);
router.use("/paineis", painelRoutes);
router.use("/relatorios", relatorioRoutes);

module.exports = router;
