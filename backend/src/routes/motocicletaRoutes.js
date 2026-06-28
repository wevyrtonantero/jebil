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

const router = Router();

router.use(authMiddleware);

router.get("/", roleMiddleware(["ADMIN", "RECEPCAO"]), listMotocicletas);
router.get("/:id", roleMiddleware(["ADMIN", "RECEPCAO"]), getMotocicleta);
router.post("/", roleMiddleware(["ADMIN", "RECEPCAO"]), createMotocicleta);
router.put("/:id", roleMiddleware(["ADMIN", "RECEPCAO"]), updateMotocicleta);
router.patch("/:id/status", roleMiddleware(["ADMIN", "RECEPCAO"]), updateMotocicletaStatus);
router.patch("/:id/reativar", roleMiddleware(["ADMIN", "RECEPCAO"]), reactivateMotocicleta);

module.exports = router;
