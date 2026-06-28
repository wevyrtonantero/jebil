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

const router = Router();

router.use(authMiddleware);

router.get("/", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA"]), listAtendimentos);
router.get("/fila", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA"]), listFila);
router.get("/:id/historico", roleMiddleware(["ADMIN", "RECEPCAO"]), getHistorico);
router.get("/:id", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA"]), getAtendimento);
router.post("/", roleMiddleware(["ADMIN", "RECEPCAO"]), createAtendimento);
router.patch("/:id/assumir", roleMiddleware(["ADMIN", "OFICINA"]), assumirAtendimento);
router.patch("/:id/status", roleMiddleware(["ADMIN", "OFICINA"]), alterarStatus);
router.patch("/:id/retornar-fila", roleMiddleware(["ADMIN", "OFICINA"]), retornarFila);
router.patch("/:id/concluir-servico", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA"]), concluirServico);
router.patch("/:id/confirmar-pagamento", roleMiddleware(["ADMIN", "RECEPCAO"]), confirmarPagamento);
router.patch("/:id/pagamento", roleMiddleware(["ADMIN", "RECEPCAO"]), updatePagamento);
router.patch("/:id/recepcao", roleMiddleware(["ADMIN", "RECEPCAO"]), updateAtendimentoRecepcao);
router.patch("/:id/liberar-retirada", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA"]), liberarRetirada);
router.patch("/:id/confirmar-retirada", roleMiddleware(["ADMIN", "RECEPCAO"]), confirmarRetirada);
router.patch("/:id/cancelar", roleMiddleware(["ADMIN", "RECEPCAO"]), cancelarAtendimento);

module.exports = router;
