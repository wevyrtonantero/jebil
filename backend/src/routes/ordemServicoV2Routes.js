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
const { perfisAplicacao } = require("../utils/roles");

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware(perfisAplicacao));

router.get("/", listOrdensServicoV2);
router.get("/sugestoes-itens", listItemSuggestionsV2);
router.get("/operacional/lista", listOperacionalV2);
router.get("/prontuario/motocicletas/:motocicletaId", getProntuarioMotocicletaV2);
router.get("/:id", getOrdemServicoV2);
router.post("/", createOrdemServicoV2);
router.post("/:ordemId/fotos-entrada", uploadFotosEntrada.array("fotos"), uploadErrorMiddleware, uploadFotosEntradaV2);
router.patch("/:ordemId/finalizar-cadastro-fotos", finalizarCadastroFotosV2);
router.post("/:ordemId/comunicacoes-whatsapp", registrarComunicacaoWhatsAppV2);
router.post("/:ordemId/assinatura-recebimento", registrarAssinaturaRecebimentoV2);
router.post("/:ordemId/assinatura-recebimento/pdf", generateAssinaturaRecebimentoPdfV2);
router.patch("/:ordemId/confirmar-retirada", confirmarRetiradaV2);
router.post("/:ordemId/orcamentos", createOrcamentoV2);
router.post("/:ordemId/items/:itemId/execucao", atribuirExecucaoV2);
router.post("/:ordemId/items/:itemId/previsoes-pecas", registrarPrevisaoPecaV2);
router.post("/orcamentos/:id/pdf", uploadOrcamentoPdf.single("arquivo"), uploadErrorMiddleware, uploadOrcamentoPdfV2);
router.post("/orcamentos/:id/gerar-pdf", generateOrcamentoPdfV2);
router.post("/:ordemId/diagnosticos", createDiagnosticoV2);
router.post("/diagnosticos/:id/itens-sugeridos", adicionarItensSugeridosDiagnosticoV2);
router.patch("/orcamentos/:id/status", updateOrcamentoStatusV2);
router.patch("/:ordemId/items/:itemId/retomar-peca", retomarItemDaPecaV2);
router.patch("/diagnosticos/:id/concluir", concluirDiagnosticoV2);
router.patch("/:ordemId/items/:itemId/status", updateItemStatusV2);
router.patch("/:ordemId/items/:itemId/autorizacao", updateItemAutorizacaoV2);
router.patch("/:ordemId/items/:itemId/pagamento", updateItemPagamentoV2);

module.exports = router;
