const { Router } = require("express");
const {
  listMotocicletas,
  getMotocicleta,
  createMotocicleta,
  updateMotocicleta,
  updateMotocicletaStatus,
  reactivateMotocicleta,
} = require("../controllers/motocicletaController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddleware");
const { perfisAplicacao } = require("../utils/roles");

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(perfisAplicacao));

router.get("/", listMotocicletas);
router.get("/:id", getMotocicleta);
router.post("/", createMotocicleta);
router.put("/:id", updateMotocicleta);
router.patch("/:id/status", updateMotocicletaStatus);
router.patch("/:id/reativar", reactivateMotocicleta);

module.exports = router;
