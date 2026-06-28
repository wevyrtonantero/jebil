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

const router = Router();

router.use(authMiddleware);

router.get("/", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA", "ORCAMENTISTA"]), listOrdensServicoV2);
router.get("/sugestoes-itens", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA", "ORCAMENTISTA"]), listItemSuggestionsV2);
router.get("/operacional/lista", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA", "ORCAMENTISTA"]), listOperacionalV2);
router.get("/prontuario/motocicletas/:motocicletaId", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA", "ORCAMENTISTA"]), getProntuarioMotocicletaV2);
router.get("/:id", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA", "ORCAMENTISTA"]), getOrdemServicoV2);
router.post("/", roleMiddleware(["ADMIN", "RECEPCAO"]), createOrdemServicoV2);
router.post("/:ordemId/fotos-entrada", roleMiddleware(["ADMIN", "RECEPCAO"]), uploadFotosEntrada.array("fotos"), uploadErrorMiddleware, uploadFotosEntradaV2);
router.patch("/:ordemId/finalizar-cadastro-fotos", roleMiddleware(["ADMIN", "RECEPCAO"]), finalizarCadastroFotosV2);
router.post("/:ordemId/comunicacoes-whatsapp", roleMiddleware(["ADMIN", "RECEPCAO", "OFICINA", "ORCAMENTISTA"]), registrarComunicacaoWhatsAppV2);
router.post("/:ordemId/orcamentos", roleMiddleware(["ADMIN", "ORCAMENTISTA"]), createOrcamentoV2);
router.post("/:ordemId/items/:itemId/execucao", roleMiddleware(["ADMIN", "OFICINA"]), atribuirExecucaoV2);
router.post("/:ordemId/items/:itemId/previsoes-pecas", roleMiddleware(["ADMIN", "OFICINA"]), registrarPrevisaoPecaV2);
router.post("/orcamentos/:id/pdf", roleMiddleware(["ADMIN", "ORCAMENTISTA"]), uploadOrcamentoPdf.single("arquivo"), uploadErrorMiddleware, uploadOrcamentoPdfV2);
router.post("/orcamentos/:id/gerar-pdf", roleMiddleware(["ADMIN", "ORCAMENTISTA"]), generateOrcamentoPdfV2);
router.post("/:ordemId/diagnosticos", roleMiddleware(["ADMIN", "OFICINA"]), createDiagnosticoV2);
router.post("/diagnosticos/:id/itens-sugeridos", roleMiddleware(["ADMIN", "OFICINA"]), adicionarItensSugeridosDiagnosticoV2);
router.patch("/orcamentos/:id/status", roleMiddleware(["ADMIN", "ORCAMENTISTA"]), updateOrcamentoStatusV2);
router.patch("/:ordemId/items/:itemId/retomar-peca", roleMiddleware(["ADMIN", "OFICINA"]), retomarItemDaPecaV2);
router.patch("/diagnosticos/:id/concluir", roleMiddleware(["ADMIN", "OFICINA"]), concluirDiagnosticoV2);
router.patch("/:ordemId/items/:itemId/status", roleMiddleware(["ADMIN", "OFICINA"]), updateItemStatusV2);
router.patch("/:ordemId/items/:itemId/autorizacao", roleMiddleware(["ADMIN", "RECEPCAO", "ORCAMENTISTA"]), updateItemAutorizacaoV2);
router.patch("/:ordemId/items/:itemId/pagamento", roleMiddleware(["ADMIN", "RECEPCAO", "ORCAMENTISTA"]), updateItemPagamentoV2);

module.exports = router;
