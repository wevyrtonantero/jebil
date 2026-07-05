const { Router } = require("express");
const { getRelatorioAtendimentos } = require("../controllers/relatorioController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddleware");
const { perfisDiretoria } = require("../utils/roles");

const router = Router();

router.use(authMiddleware);
router.get("/atendimentos", roleMiddleware(perfisDiretoria), getRelatorioAtendimentos);

module.exports = router;
