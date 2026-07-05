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
const { perfisAplicacao } = require("../utils/roles");

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(perfisAplicacao));

router.get("/", listMecanicos);
router.get("/:id", getMecanico);
router.post("/", createMecanico);
router.put("/:id", updateMecanico);
router.patch("/:id/status", updateMecanicoStatus);
router.patch("/:id/disponibilidade", updateMecanicoDisponibilidade);
router.post("/:id/foto", uploadMecanicoFoto.single("foto"), uploadErrorMiddleware, uploadFoto);
router.delete("/:id/foto", deleteFoto);

module.exports = router;
