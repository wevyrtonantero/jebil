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
const { perfisAplicacao, perfisOperacao } = require("../utils/roles");

const router = Router();

router.use(authMiddleware);

router.get("/", roleMiddleware(perfisOperacao), listMecanicos);
router.get("/:id", roleMiddleware(perfisAplicacao), getMecanico);
router.post("/", roleMiddleware(perfisAplicacao), createMecanico);
router.put("/:id", roleMiddleware(perfisAplicacao), updateMecanico);
router.patch("/:id/status", roleMiddleware(perfisAplicacao), updateMecanicoStatus);
router.patch("/:id/disponibilidade", roleMiddleware(perfisAplicacao), updateMecanicoDisponibilidade);
router.post("/:id/foto", roleMiddleware(perfisAplicacao), uploadMecanicoFoto.single("foto"), uploadErrorMiddleware, uploadFoto);
router.delete("/:id/foto", roleMiddleware(perfisAplicacao), deleteFoto);

module.exports = router;
