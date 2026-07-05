const { Router } = require("express");
const {
  listAtendimentos,
  listFila,
  getAtendimento,
  createAtendimento,
  assumirAtendimento,
  alterarStatus,
  retornarFila,
  concluirServico,
  confirmarPagamento,
  updatePagamento,
  updateAtendimentoRecepcao,
  liberarRetirada,
  confirmarRetirada,
  cancelarAtendimento,
  getHistorico,
} = require("../controllers/atendimentoController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddleware");
const { perfisAplicacao } = require("../utils/roles");

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(perfisAplicacao));

router.get("/", listAtendimentos);
router.get("/fila", listFila);
router.get("/:id/historico", getHistorico);
router.get("/:id", getAtendimento);
router.post("/", createAtendimento);
router.patch("/:id/assumir", assumirAtendimento);
router.patch("/:id/status", alterarStatus);
router.patch("/:id/retornar-fila", retornarFila);
router.patch("/:id/concluir-servico", concluirServico);
router.patch("/:id/confirmar-pagamento", confirmarPagamento);
router.patch("/:id/pagamento", updatePagamento);
router.patch("/:id/recepcao", updateAtendimentoRecepcao);
router.patch("/:id/liberar-retirada", liberarRetirada);
router.patch("/:id/confirmar-retirada", confirmarRetirada);
router.patch("/:id/cancelar", cancelarAtendimento);

module.exports = router;
