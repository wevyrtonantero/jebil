const { Router } = require("express");
const {
  listMecanicos,
  getMecanico,
  createMecanico,
  updateMecanico,
  updateMecanicoStatus,
  updateMecanicoDisponibilidade,
  uploadFoto,
  deleteFoto,
} = require("../controllers/mecanicoController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddleware");
const { uploadMecanicoFoto } = require("../config/upload");
const { uploadErrorMiddleware } = require("../middlewares/uploadErrorMiddleware");

const router = Router();

router.use(authMiddleware);

router.get("/", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA"]), listMecanicos);
router.get("/:id", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA"]), getMecanico);
router.post("/", roleMiddleware(["ADMIN"]), createMecanico);
router.put("/:id", roleMiddleware(["ADMIN"]), updateMecanico);
router.patch("/:id/status", roleMiddleware(["ADMIN"]), updateMecanicoStatus);
router.patch("/:id/disponibilidade", roleMiddleware(["ADMIN"]), updateMecanicoDisponibilidade);
router.post("/:id/foto", roleMiddleware(["ADMIN"]), uploadMecanicoFoto.single("foto"), uploadErrorMiddleware, uploadFoto);
router.delete("/:id/foto", roleMiddleware(["ADMIN"]), deleteFoto);

module.exports = router;
