const { Router } = require("express");
const {
  listClientes,
  getCliente,
  createCliente,
  updateCliente,
  updateClienteStatus,
  reactivateCliente,
} = require("../controllers/clienteController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddleware");
const { perfisAplicacao } = require("../utils/roles");

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(perfisAplicacao));

router.get("/", listClientes);
router.get("/:id", getCliente);
router.post("/", createCliente);
router.put("/:id", updateCliente);
router.patch("/:id/status", updateClienteStatus);
router.patch("/:id/reativar", reactivateCliente);

module.exports = router;
