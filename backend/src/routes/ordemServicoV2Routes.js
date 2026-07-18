const { Router } = require("express");
const {
  listOrdensServicoV2,
  getOrdemServicoV2,
  createOrdemServicoV2,
  updateItemStatusV2,
  updateItemAutorizacaoV2,
  updateItemPagamentoV2,
  createDiagnosticoV2,
  concluirDiagnosticoV2,
  adicionarItensSugeridosDiagnosticoV2,
  getProntuarioMotocicletaV2,
  listOperacionalV2,
  listItemSuggestionsV2,
  reordenarControlePatioV2,
  adicionarServicoRapidoV2,
  cancelarServicoRapidoV2,
} = require("../controllers/ordemServicoV2Controller");
const {
  uploadFotosEntradaV2,
  finalizarCadastroFotosV2,
  registrarComunicacaoWhatsAppV2,
  registrarAssinaturaRecebimentoV2,
  generateAssinaturaRecebimentoPdfV2,
  confirmarRetiradaV2,
  createOrcamentoV2,
  updateOrcamentoStatusV2,
  registrarPrevisaoPecaV2,
  retomarItemDaPecaV2,
  atribuirExecucaoV2,
  uploadOrcamentoPdfV2,
  generateOrcamentoPdfV2,
} = require("../controllers/ordemServicoV2ExtraController");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { roleMiddleware } = require("../middlewares/roleMiddleware");
const { uploadFotosEntrada, uploadOrcamentoPdf } = require("../config/upload");
const { uploadErrorMiddleware } = require("../middlewares/uploadErrorMiddleware");
const { perfisAplicacao, perfisOperacao } = require("../utils/roles");

const router = Router();

router.use(authMiddleware);

router.get("/", roleMiddleware(perfisAplicacao), listOrdensServicoV2);
router.get("/sugestoes-itens", roleMiddleware(perfisAplicacao), listItemSuggestionsV2);
router.get("/operacional/lista", roleMiddleware(perfisOperacao), listOperacionalV2);
router.patch("/operacional/controle-patio", roleMiddleware(perfisAplicacao), reordenarControlePatioV2);
router.get("/prontuario/motocicletas/:motocicletaId", roleMiddleware(perfisAplicacao), getProntuarioMotocicletaV2);
router.get("/:id", roleMiddleware(perfisOperacao), getOrdemServicoV2);
router.post("/", roleMiddleware(perfisAplicacao), createOrdemServicoV2);
router.post("/:ordemId/fotos-entrada", roleMiddleware(perfisAplicacao), uploadFotosEntrada.array("fotos"), uploadErrorMiddleware, uploadFotosEntradaV2);
router.patch("/:ordemId/finalizar-cadastro-fotos", roleMiddleware(perfisAplicacao), finalizarCadastroFotosV2);
router.post("/:ordemId/comunicacoes-whatsapp", roleMiddleware(perfisOperacao), registrarComunicacaoWhatsAppV2);
router.post("/:ordemId/assinatura-recebimento", roleMiddleware(perfisAplicacao), registrarAssinaturaRecebimentoV2);
router.post("/:ordemId/assinatura-recebimento/pdf", roleMiddleware(perfisAplicacao), generateAssinaturaRecebimentoPdfV2);
router.patch("/:ordemId/confirmar-retirada", roleMiddleware(perfisAplicacao), confirmarRetiradaV2);
router.patch("/:ordemId/cancelar-servico-rapido", roleMiddleware(perfisOperacao), cancelarServicoRapidoV2);
router.post("/:ordemId/orcamentos", roleMiddleware(perfisAplicacao), createOrcamentoV2);
router.post("/:ordemId/items/servico-rapido", roleMiddleware(perfisOperacao), adicionarServicoRapidoV2);
router.post("/:ordemId/items/:itemId/execucao", roleMiddleware(perfisOperacao), atribuirExecucaoV2);
router.post("/:ordemId/items/:itemId/previsoes-pecas", roleMiddleware(perfisOperacao), registrarPrevisaoPecaV2);
router.post("/orcamentos/:id/pdf", roleMiddleware(perfisAplicacao), uploadOrcamentoPdf.single("arquivo"), uploadErrorMiddleware, uploadOrcamentoPdfV2);
router.post("/orcamentos/:id/gerar-pdf", roleMiddleware(perfisAplicacao), generateOrcamentoPdfV2);
router.post("/:ordemId/diagnosticos", roleMiddleware(perfisOperacao), createDiagnosticoV2);
router.post("/diagnosticos/:id/itens-sugeridos", roleMiddleware(perfisOperacao), adicionarItensSugeridosDiagnosticoV2);
router.patch("/orcamentos/:id/status", roleMiddleware(perfisAplicacao), updateOrcamentoStatusV2);
router.patch("/:ordemId/items/:itemId/retomar-peca", roleMiddleware(perfisOperacao), retomarItemDaPecaV2);
router.patch("/diagnosticos/:id/concluir", roleMiddleware(perfisOperacao), concluirDiagnosticoV2);
router.patch("/:ordemId/items/:itemId/status", roleMiddleware(perfisOperacao), updateItemStatusV2);
router.patch("/:ordemId/items/:itemId/autorizacao", roleMiddleware(perfisAplicacao), updateItemAutorizacaoV2);
router.patch("/:ordemId/items/:itemId/pagamento", roleMiddleware(perfisAplicacao), updateItemPagamentoV2);

module.exports = router;
