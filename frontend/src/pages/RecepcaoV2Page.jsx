import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCliente, listClientes, reactivateCliente, updateCliente } from "../services/clienteService";
import {
  createMotocicleta,
  listMotocicletas,
  listMotocicletasByCliente,
  reactivateMotocicleta,
  updateMotocicleta,
} from "../services/motocicletaService";
import {
  confirmarRetiradaV2,
  createOrdemServicoV2,
  getOrdemServicoV2,
  listItemSuggestionsV2,
  listOrdensServicoV2,
  updateItemPagamentoV2,
  uploadFotosEntradaV2,
} from "../services/ordemServicoV2Service";
import Modal from "../components/common/Modal";
import AppIcon from "../components/common/AppIcon";
import { brandOptions, getModelOptions } from "../data/motoCatalog";
import { formatCpf, formatPhone, formatPlate } from "../utils/formatters";
import { resolveApiOrigin } from "../utils/apiUrls";

const initialItem = () => ({
  descricao: "",
  quantidade: "1",
  valor_unitario: "",
  valor_total: "",
  pagamento_status: "PENDENTE",
});

const colorOptions = [
  "Preta",
  "Branca",
  "Prata",
  "Cinza",
  "Azul",
  "Vermelha",
  "Verde",
  "Amarela",
  "Laranja",
  "Marrom",
  "Bege",
];

const createInitialForm = () => ({
  nome: "",
  telefone: "",
  cpf: "",
  modelo: "",
  marca: "",
  ano: "",
  cor: "",
  placa: "",
  km: "",
  buscar_moto: false,
  endereco_retirada_rua: "",
  endereco_retirada_numero: "",
  endereco_retirada_bairro: "",
  endereco_retirada_cidade: "",
  dispensa_queixa_principal: false,
  queixa_principal: "",
  items: [initialItem()],
});

function resolveColorFieldTheme(value) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const palettes = [
    { match: ["preta", "preto", "black", "grafite"], background: "#2a3145", color: "#f5f7fb", border: "#56627d" },
    { match: ["branca", "branco", "white", "perola", "pérola"], background: "#f4f7fb", color: "#10213f", border: "#c8d3e4" },
    { match: ["prata", "silver"], background: "#cfd6e3", color: "#10213f", border: "#a7b3c8" },
    { match: ["cinza", "gray", "grey"], background: "#98a4b8", color: "#10213f", border: "#7d8aa0" },
    { match: ["azul", "blue"], background: "#7eb7ff", color: "#0d2244", border: "#5a96e6" },
    { match: ["vermelha", "vermelho", "red"], background: "#ff8a8a", color: "#4b0f14", border: "#e66d6d" },
    { match: ["verde", "green"], background: "#8be0a6", color: "#133b22", border: "#65bd81" },
    { match: ["amarela", "amarelo", "yellow"], background: "#ffe17a", color: "#4e3900", border: "#e2c257" },
    { match: ["laranja", "orange"], background: "#ffb26b", color: "#4a2100", border: "#ea9341" },
    { match: ["rosa", "pink"], background: "#ffb3d1", color: "#5a1732", border: "#f08ab4" },
    { match: ["roxa", "roxo", "purple", "violeta"], background: "#c5a3ff", color: "#2f1656", border: "#a07ce6" },
    { match: ["marrom", "brown"], background: "#c89973", color: "#352012", border: "#aa7d59" },
    { match: ["bege", "champagne"], background: "#ead4ae", color: "#4c3920", border: "#d3bb90" },
  ];

  const palette = palettes.find((item) => item.match.some((term) => normalized.includes(term)));

  if (!palette) {
    return {
      background: "rgba(126, 183, 255, 0.18)",
      color: "var(--text-main)",
      border: "rgba(126, 183, 255, 0.4)",
    };
  }

  return palette;
}

function normalizePlateValue(value) {
  return String(value || "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

function normalizeCurrencyInput(value) {
  const normalized = String(value || "").replace(",", ".");
  return normalized.replace(/[^\d.]/g, "");
}

function toMoney(value) {
  return Number(value || 0).toFixed(2);
}

function calculateItemTotal(quantidade, valorUnitario) {
  if (!hasFilledValue(quantidade) || !hasFilledValue(valorUnitario)) {
    return "";
  }

  return toMoney(Number(quantidade || 0) * Number(valorUnitario || 0));
}

function hasFilledValue(value) {
  return String(value ?? "").trim().length > 0;
}

function formatReadyTime(value) {
  if (!value) {
    return "Agora";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatExternalNumber(value = "") {
  const normalized = String(value || "").replace(/^#+/, "").trimStart();
  return normalized ? `#${normalized}` : "";
}

function getApiOrigin() {
  return resolveApiOrigin();
}

function getPublicAssetUrl(path = "") {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${getApiOrigin()}${path.startsWith("/") ? path : `/${path}`}`;
}

function isAtendimentoRapido(ordem) {
  if (ordem?.legado_atendimento_id) {
    return true;
  }

  const itensValidos = (ordem?.items || []).filter((item) => item.status_item !== "CANCELADO");

  return (
    !String(ordem?.queixa_principal || "").trim() &&
    itensValidos.length > 0 &&
    itensValidos.every((item) => Boolean(item.execucao_direta) && !Boolean(item.exige_diagnostico))
  );
}

function RecepcaoV2Page() {
  const navigate = useNavigate();
  const photoInputRef = useRef(null);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [readyOrders, setReadyOrders] = useState([]);
  const [readyLoading, setReadyLoading] = useState(false);
  const [readyActionId, setReadyActionId] = useState(null);
  const [readyFeedback, setReadyFeedback] = useState("");
  const [form, setForm] = useState(createInitialForm);
  const [itemSuggestions, setItemSuggestions] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [motoChoiceOpen, setMotoChoiceOpen] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [selectedMotoId, setSelectedMotoId] = useState(null);
  const [selectedMotoPlate, setSelectedMotoPlate] = useState("");
  const [motosAssociadas, setMotosAssociadas] = useState([]);
  const [cpfLoading, setCpfLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [successData, setSuccessData] = useState(null);
  const [fotosEntrada, setFotosEntrada] = useState([]);
  const [duplicateOrderModal, setDuplicateOrderModal] = useState({ open: false, message: "", plate: "" });

  const modelosDisponiveis = useMemo(() => getModelOptions(form.marca, form.modelo), [form.marca, form.modelo]);
  const colorFieldTheme = useMemo(() => resolveColorFieldTheme(form.cor), [form.cor]);
  const totalPrevioItens = useMemo(
    () => form.items.reduce((total, item) => total + Number(item.valor_total || 0), 0),
    [form.items],
  );

  function resetForNewOrder() {
    setForm(createInitialForm());
    setSelectedClienteId(null);
    setSelectedMotoId(null);
    setSelectedMotoPlate("");
    setMotosAssociadas([]);
    setFotosEntrada([]);
    setConfirmOpen(false);
    setMotoChoiceOpen(false);
    setSuccessData(null);
    setError("");
    setDuplicateOrderModal({ open: false, message: "", plate: "" });
    setIntakeOpen(false);
  }

  async function loadReadyOrders() {
    setReadyLoading(true);

    try {
      const data = await listOrdensServicoV2({ status_geral: "PRONTA_PARA_RETIRADA" });
      const paidQuickOrders = data.filter((ordem) => isAtendimentoRapido(ordem) && Number(ordem.valor_pendente_ordem || 0) <= 0);
      const visibleOrders = data.filter((ordem) => !(isAtendimentoRapido(ordem) && Number(ordem.valor_pendente_ordem || 0) <= 0));

      setReadyOrders(visibleOrders);

      await Promise.allSettled(paidQuickOrders.map((ordem) => confirmarRetiradaV2(ordem.id)));
    } catch {
      setReadyFeedback("Nao foi possivel carregar as motos aguardando retirada.");
    } finally {
      setReadyLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReadyOrders();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function openNewAttendance() {
    resetForNewOrder();
    setReadyFeedback("");
    setIntakeOpen(true);
  }

  async function handleConfirmWithdrawal(ordem) {
    const confirmed = window.confirm(`Confirmar retirada da moto ${ordem.motocicleta_placa || ordem.motocicleta_modelo}?`);

    if (!confirmed) {
      return;
    }

    setReadyActionId(ordem.id);
    setReadyFeedback("");

    try {
      await confirmarRetiradaV2(ordem.id);
      setReadyOrders((current) => current.filter((item) => Number(item.id) !== Number(ordem.id)));
      setReadyFeedback(`${ordem.cliente_nome} marcado como retirado.`);
    } catch (requestError) {
      setReadyFeedback(requestError?.response?.data?.message || "Nao foi possivel confirmar a retirada.");
    } finally {
      setReadyActionId(null);
    }
  }

  async function handleConfirmQuickPayment(ordem) {
    const confirmed = window.confirm(`Confirmar pagamento de R$ ${toMoney(ordem.valor_pendente_ordem || 0)} e finalizar a retirada?`);

    if (!confirmed) {
      return;
    }

    setReadyActionId(ordem.id);
    setReadyFeedback("");

    try {
      const detail = await getOrdemServicoV2(ordem.id);
      const pendingItems = (detail.items || []).filter(
        (item) =>
          item.pagamento_status !== "PAGO" &&
          item.status_item !== "CANCELADO" &&
          String(item.descricao || "").trim().toLowerCase() !== "diagnostico inicial",
      );

      await Promise.all(pendingItems.map((item) => updateItemPagamentoV2(detail.id, item.id, "PAGO")));
      await confirmarRetiradaV2(detail.id);
      setReadyOrders((current) => current.filter((item) => Number(item.id) !== Number(ordem.id)));
      setReadyFeedback(`${ordem.cliente_nome} pago e arquivado.`);
    } catch (requestError) {
      setReadyFeedback(requestError?.response?.data?.message || "Nao foi possivel confirmar o pagamento.");
    } finally {
      setReadyActionId(null);
    }
  }

  function buildEnderecoRetirada() {
    return [
      form.endereco_retirada_rua?.trim(),
      form.endereco_retirada_numero?.trim() ? `Numero ${form.endereco_retirada_numero.trim()}` : "",
      form.endereco_retirada_bairro?.trim() ? `Bairro ${form.endereco_retirada_bairro.trim()}` : "",
      form.endereco_retirada_cidade?.trim() ? `Cidade ${form.endereco_retirada_cidade.trim()}` : "",
    ]
      .filter(Boolean)
      .join(", ");
  }

  function toggleBuscarMoto() {
    setForm((current) => {
      if (current.buscar_moto) {
        return {
          ...current,
          buscar_moto: false,
          endereco_retirada_rua: "",
          endereco_retirada_numero: "",
          endereco_retirada_bairro: "",
          endereco_retirada_cidade: "",
        };
      }

      return {
        ...current,
        buscar_moto: true,
        dispensa_queixa_principal: false,
      };
    });
  }

  function toggleDispensaQueixa() {
    setForm((current) => ({
      ...current,
      dispensa_queixa_principal: !current.dispensa_queixa_principal,
      buscar_moto: current.dispensa_queixa_principal ? current.buscar_moto : false,
      endereco_retirada_rua: current.dispensa_queixa_principal ? current.endereco_retirada_rua : "",
      endereco_retirada_numero: current.dispensa_queixa_principal ? current.endereco_retirada_numero : "",
      endereco_retirada_bairro: current.dispensa_queixa_principal ? current.endereco_retirada_bairro : "",
      endereco_retirada_cidade: current.dispensa_queixa_principal ? current.endereco_retirada_cidade : "",
    }));
  }

  async function loadItemSuggestions(query = "") {
    const data = await listItemSuggestionsV2(query, 30);
    setItemSuggestions(data);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadItemSuggestions().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function updateField(field, value) {
    setSuccessData(null);
    setError("");

    if (field === "placa") {
      const normalizedPlate = normalizePlateValue(value);
      const matchedMoto = motosAssociadas.find((moto) => normalizePlateValue(moto.placa) === normalizedPlate);

      if (matchedMoto) {
        applyMotoToForm(matchedMoto);
        return;
      }

      if (selectedMotoId && normalizedPlate !== normalizePlateValue(selectedMotoPlate)) {
        setSelectedMotoId(null);
        setSelectedMotoPlate("");
      }
    }

    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItem(index, field, value) {
    setSuccessData(null);
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const updatedItem = {
          ...item,
          [field]: value,
        };

        if (field === "quantidade" || field === "valor_unitario") {
          updatedItem.valor_total = calculateItemTotal(updatedItem.quantidade, updatedItem.valor_unitario);
        }

        return updatedItem;
      }),
    }));
  }

  function addItem() {
    setSuccessData(null);
    setForm((current) => ({
      ...current,
      items: [...current.items, initialItem()],
    }));
  }

  function removeItem(index) {
    setSuccessData(null);
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function toggleItemPayment(index) {
    setSuccessData(null);
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, pagamento_status: item.pagamento_status === "PAGO" ? "PENDENTE" : "PAGO" }
          : item,
      ),
    }));
  }

  function appendFotos(files) {
    setSuccessData(null);
    setFotosEntrada((current) => [...current, ...files]);
  }

  function removeFoto(index) {
    setFotosEntrada((current) => current.filter((_, photoIndex) => photoIndex !== index));
  }

  function applyMotoToForm(moto) {
    setSelectedMotoId(moto.id);
    setSelectedMotoPlate(moto.placa || "");
    setForm((current) => ({
      ...current,
      modelo: moto.modelo || "",
      marca: moto.marca || "",
      ano: moto.ano === null || moto.ano === undefined ? "" : String(moto.ano),
      cor: moto.cor || "",
      placa: moto.placa || "",
      km: moto.km === null || moto.km === undefined ? "" : String(moto.km),
    }));
    setMotoChoiceOpen(false);
  }

  function clearMotoSelection() {
    setSelectedMotoId(null);
    setSelectedMotoPlate("");
    setForm((current) => ({
      ...current,
      modelo: "",
      marca: "",
      ano: "",
      cor: "",
      placa: "",
      km: "",
    }));
    setMotoChoiceOpen(false);
  }

  const handleCpfLookup = useCallback(async (rawCpf) => {
    const cpf = rawCpf.replace(/\D/g, "");

    if (cpf.length !== 11) {
      return;
    }

    setCpfLoading(true);
    setError("");

    try {
      const result = await listClientes({ cpf, limit: 1, ativo: true });
      const cliente = result.data?.[0];

      if (!cliente) {
        setSelectedClienteId(null);
        setSelectedMotoId(null);
        setSelectedMotoPlate("");
        setMotosAssociadas([]);
        return;
      }

      setSelectedClienteId(cliente.id);
      setForm((current) => ({
        ...current,
        nome: cliente.nome || current.nome,
        telefone: cliente.telefone || current.telefone,
        cpf: cliente.cpf || current.cpf,
      }));

      const motos = await listMotocicletasByCliente(cliente.id);
      setMotosAssociadas(motos);

      if (motos.length === 1) {
        applyMotoToForm(motos[0]);
      } else if (motos.length > 1) {
        setMotoChoiceOpen(true);
      } else {
        clearMotoSelection();
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel localizar o cliente pelo CPF.");
    } finally {
      setCpfLoading(false);
    }
  }, []);

  useEffect(() => {
    const cpfDigits = form.cpf.replace(/\D/g, "");

    if (cpfDigits.length !== 11) {
      setCpfLoading(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleCpfLookup(form.cpf);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [form.cpf, handleCpfLookup]);

  function validateBeforeReview() {
    const missingFields = [];
    const isFastService = form.dispensa_queixa_principal;

    if (!hasFilledValue(form.nome)) missingFields.push("nome do cliente");
    if (!isFastService && !hasFilledValue(form.telefone)) missingFields.push("telefone");
    if (!hasFilledValue(form.modelo)) missingFields.push("modelo da moto");
    if (!isFastService && !hasFilledValue(form.ano)) missingFields.push("ano da moto");
    if (!hasFilledValue(form.placa)) missingFields.push("placa da moto");
    if (!isFastService && !hasFilledValue(form.queixa_principal)) missingFields.push("queixa principal");

    if (missingFields.length) {
      const message = `Falta preencher: ${missingFields.join(", ")}.`;
      setError(message);
      return false;
    }

    if (
      form.buscar_moto &&
      (!hasFilledValue(form.endereco_retirada_rua) ||
        !hasFilledValue(form.endereco_retirada_numero) ||
        !hasFilledValue(form.endereco_retirada_bairro) ||
        !hasFilledValue(form.endereco_retirada_cidade))
    ) {
      const message = "Preencha rua, numero, bairro e cidade quando o SOS estiver ativo.";
      setError(message);
      return false;
    }

    if (form.dispensa_queixa_principal && (!form.items.length || form.items.some((item) => !hasFilledValue(item.descricao)))) {
      const message = "No servico rapido, informe pelo menos um servico ou peca na lista.";
      setError(message);
      return false;
    }

    setError("");
    return true;
  }

  async function resolveCliente() {
    if (selectedClienteId) {
      return updateCliente(selectedClienteId, {
        nome: form.nome,
        telefone: form.telefone,
        cpf: form.cpf,
        observacoes: null,
      });
    }

    try {
      return await createCliente({
        nome: form.nome,
        telefone: form.telefone,
        cpf: form.cpf,
        observacoes: null,
      });
    } catch (requestError) {
      if (requestError?.response?.status !== 409 || !form.cpf) {
        throw requestError;
      }

      const ativos = await listClientes({ cpf: form.cpf, limit: 1, ativo: true });
      const clienteAtivo = ativos.data?.[0];

      if (clienteAtivo) {
        setSelectedClienteId(clienteAtivo.id);
        return updateCliente(clienteAtivo.id, {
          nome: form.nome,
          telefone: form.telefone,
          cpf: form.cpf,
          observacoes: null,
        });
      }

      const inativos = await listClientes({ cpf: form.cpf, limit: 1, ativo: false });
      const clienteInativo = inativos.data?.[0];

      if (!clienteInativo) {
        throw requestError;
      }

      await reactivateCliente(clienteInativo.id);
      setSelectedClienteId(clienteInativo.id);
      return updateCliente(clienteInativo.id, {
        nome: form.nome,
        telefone: form.telefone,
        cpf: form.cpf,
        observacoes: null,
      });
    }
  }

  async function resolveMotocicleta(clienteId) {
    const payload = {
      cliente_id: clienteId,
      modelo: form.modelo,
      marca: form.marca || null,
      ano: form.ano || null,
      cor: form.cor || null,
      placa: form.placa,
      km: form.km || null,
      observacoes: null,
    };

    if (selectedMotoId) {
      return updateMotocicleta(selectedMotoId, payload);
    }

    try {
      return await createMotocicleta(payload);
    } catch (requestError) {
      if (requestError?.response?.status !== 409 || !form.placa) {
        throw requestError;
      }

      const ativas = await listMotocicletas({ placa: form.placa, limit: 1, ativo: true });
      const motoAtiva = ativas.data?.[0];

      if (motoAtiva) {
        if (Number(motoAtiva.cliente_id) !== Number(clienteId)) {
          throw requestError;
        }

        setSelectedMotoId(motoAtiva.id);
        setSelectedMotoPlate(motoAtiva.placa || "");
        return updateMotocicleta(motoAtiva.id, payload);
      }

      const inativas = await listMotocicletas({ placa: form.placa, limit: 1, ativo: false });
      const motoInativa = inativas.data?.[0];

      if (!motoInativa) {
        throw requestError;
      }

      if (Number(motoInativa.cliente_id) !== Number(clienteId)) {
        throw requestError;
      }

      await reactivateMotocicleta(motoInativa.id);
      setSelectedMotoId(motoInativa.id);
      setSelectedMotoPlate(motoInativa.placa || "");
      return updateMotocicleta(motoInativa.id, payload);
    }
  }

  async function handleConfirmSubmit() {
    setSending(true);
    setError("");

    try {
      const cliente = await resolveCliente();
      const motocicleta = await resolveMotocicleta(cliente.id);

      const payload = {
        cliente_id: cliente.id,
        motocicleta_id: motocicleta.id,
        atendimento_rapido: form.dispensa_queixa_principal,
        queixa_principal: form.queixa_principal.trim(),
        observacoes_entrada: null,
        observacoes_internas: null,
        km_entrada: form.km || null,
        buscar_moto: form.buscar_moto,
        endereco_retirada: form.buscar_moto ? buildEnderecoRetirada() : null,
        items: form.items
          .filter((item) => item.descricao.trim())
          .map((item) => ({
            descricao: item.descricao,
            quantidade: Number(item.quantidade || 1),
            valor_unitario: Number(item.valor_unitario || 0),
            valor_total: Number(item.valor_total || 0),
            execucao_direta: form.dispensa_queixa_principal,
            exige_diagnostico: !form.dispensa_queixa_principal,
            autorizacao_status: "NAO_SE_APLICA",
            pagamento_status: item.pagamento_status,
          })),
      };

      const ordem = await createOrdemServicoV2(payload);
      let bundle = ordem;

      if (fotosEntrada.length) {
        bundle = await uploadFotosEntradaV2(ordem.id, fotosEntrada);
      }

      const isServicoRapido = form.dispensa_queixa_principal;
      setForm(createInitialForm());
      setSelectedClienteId(null);
      setSelectedMotoId(null);
      setSelectedMotoPlate("");
      setMotosAssociadas([]);
      setFotosEntrada([]);
      setConfirmOpen(false);
      await loadItemSuggestions();

      if (!isServicoRapido) {
        navigate(`/recepcao/fotos?ordemId=${ordem.id}`);
        return;
      }

      setSuccessData({
        numero_os: ordem.numero_os,
        cliente_nome: cliente.nome,
        motocicleta_modelo: motocicleta.modelo,
        motocicleta_placa: motocicleta.placa,
        fotos_entrada: bundle.fotos_entrada?.length || 0,
      });
    } catch (requestError) {
      const status = requestError?.response?.status;
      const message = requestError?.response?.data?.message || "Nao foi possivel abrir a ordem de servico.";

      if (status === 409 && /ordem ativa/i.test(message)) {
        setConfirmOpen(false);
        setDuplicateOrderModal({
          open: true,
          message,
          plate: form.placa,
        });
      } else {
        setError(message);
      }
    } finally {
      setSending(false);
    }
  }

  function openProntuarioForCurrentPlate() {
    const plate = normalizePlateValue(duplicateOrderModal.plate || form.placa);

    setDuplicateOrderModal({ open: false, message: "", plate: "" });

    if (!plate) {
      navigate("/v2/prontuario");
      return;
    }

    navigate(`/v2/prontuario?placa=${plate}`);
  }

  function openReview() {
    setSuccessData(null);
    setError("");

    try {
      if (!validateBeforeReview()) {
        return;
      }
    } catch (validationError) {
      const message = validationError?.message || "Erro inesperado ao validar o formulario.";
      setError(message);
      return;
    }

    setConfirmOpen(true);
  }

  function handleOpenConfirm(event) {
    event?.preventDefault();
    openReview();
  }

  return (
    <section className="page-section">
      <datalist id="brand-options-v2">
        {brandOptions.map((brand) => (
          <option key={brand} value={brand} />
        ))}
      </datalist>
      <datalist id="model-options-v2">
        {modelosDisponiveis.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>
      <datalist id="service-options-v2">
        {itemSuggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <datalist id="color-options-v2">
        {colorOptions.map((color) => (
          <option key={color} value={color} />
        ))}
      </datalist>

      <div className="workspace-card recepcao-desk-panel">
        <div className="workspace-heading">
          <div className="title-with-icon">
            <span className="title-icon">
              <AppIcon name="reception" />
            </span>
            <div>
              <p className="eyebrow">Recepcao</p>
              <h2>Atendimento e retirada</h2>
            </div>
          </div>
          <button type="button" className="primary-button recepcao-new-attendance-button" onClick={openNewAttendance}>
            <AppIcon name="plus" size={18} />
            Novo atendimento
          </button>
        </div>

        <div className="recepcao-ready-section">
          <div className="workspace-heading compact-heading">
            <div>
              <p className="eyebrow">Motos concluidas</p>
              <h2>Aguardando retirada</h2>
            </div>
            <span className="summary-pill strong">{readyOrders.length}</span>
          </div>

          <div className="recepcao-ready-list">
            {readyOrders.map((ordem) => {
              const externalNumber = formatExternalNumber(ordem.numero_externo);
              const budgetPdfUrl = getPublicAssetUrl(ordem.orcamento_pdf_url);
              const pendingAmount = Number(ordem.valor_pendente_ordem || 0);
              const totalAmount = Number(ordem.valor_total_ordem || 0);

              return (
                <article className="recepcao-ready-card" key={ordem.id}>
                  <div className="recepcao-ready-copy">
                    <strong>{ordem.cliente_nome}</strong>
                    <p>
                      {ordem.motocicleta_modelo}
                      {ordem.motocicleta_placa ? ` - ${ordem.motocicleta_placa}` : ""}
                      {externalNumber ? " | " : ""}
                      {externalNumber && budgetPdfUrl ? (
                        <a className="external-budget-link" href={budgetPdfUrl} target="_blank" rel="noreferrer">
                          {externalNumber}
                        </a>
                      ) : externalNumber}
                    </p>
                    <div className="recepcao-ready-meta">
                      <small>Pronta desde {formatReadyTime(ordem.pronta_retirada_em || ordem.atualizado_em)}</small>
                      <strong className="recepcao-payment-amount">Total R$ {toMoney(totalAmount)}</strong>
                    </div>
                  </div>
                  <div className="recepcao-ready-actions">
                    {pendingAmount > 0 ? (
                      <button
                        type="button"
                        className="recepcao-paid-button"
                        onClick={() => void handleConfirmQuickPayment(ordem)}
                        disabled={readyActionId === ordem.id}
                        title="Confirmar pagamento e finalizar retirada"
                      >
                        <AppIcon name="money" size={16} />
                        Pago
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="icon-button ready-withdraw-button"
                        onClick={() => void handleConfirmWithdrawal(ordem)}
                        disabled={readyActionId === ordem.id}
                        aria-label="Confirmar retirada"
                        title="Confirmar retirada"
                      >
                        <AppIcon name="check" size={18} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}

            {!readyLoading && readyOrders.length === 0 ? <div className="empty-state">Nenhuma moto aguardando retirada.</div> : null}
            {readyLoading ? <div className="empty-state">Carregando retiradas...</div> : null}
          </div>

          {readyFeedback ? <p className="field-note">{readyFeedback}</p> : null}
        </div>
      </div>

      {intakeOpen ? (
      <div className="workspace-grid recepcao-form-grid">
        <form className="workspace-card recepcao-form-card" onSubmit={handleOpenConfirm}>
          <div className="workspace-heading">
            <div className="title-with-icon">
              <span className="title-icon">
                <AppIcon name="reception" />
              </span>
              <div>
                <p className="eyebrow">Recepcao</p>
                <h2>Inicio do fluxo</h2>
                <p className="subtitle">Cadastro rapido da moto, abertura da OS e registro inicial do atendimento.</p>
              </div>
            </div>
            <div className="recepcao-quick-actions">
              <button type="button" className={`quick-icon-button ${form.buscar_moto ? "active sos" : ""}`} onClick={toggleBuscarMoto}>
                <AppIcon name="sos" size={18} />
                <span>SOS</span>
              </button>
              <button
                type="button"
                className={`quick-icon-button ${form.dispensa_queixa_principal ? "active fast" : ""}`}
                onClick={toggleDispensaQueixa}
              >
                <AppIcon name="flash" size={18} />
                <span>Rapido</span>
              </button>
            </div>
          </div>
          {error ? <p className="form-error recepcao-top-error">{error}</p> : null}

          <div className="field-grid two-up">
            <label className="field-label">
              CPF
              <input value={form.cpf} placeholder="000.000.000-00" onChange={(event) => updateField("cpf", formatCpf(event.target.value))} />
              {cpfLoading ? <span className="field-note">Buscando cliente...</span> : null}
            </label>
            <label className="field-label">
              Telefone{form.dispensa_queixa_principal ? "" : " *"}
              <input value={form.telefone} placeholder="(11) 99999-9999" onChange={(event) => updateField("telefone", formatPhone(event.target.value))} />
            </label>
          </div>

          <div className="field-grid">
            <label className="field-label">
              Cliente *
              <input value={form.nome} placeholder="Nome completo do cliente" onChange={(event) => updateField("nome", event.target.value)} />
            </label>
          </div>

          <div className="field-grid four-up">
            <label className="field-label">
              Marca
              <input list="brand-options-v2" value={form.marca} placeholder="Honda" onChange={(event) => updateField("marca", event.target.value)} />
            </label>
            <label className="field-label">
              Modelo *
              <input list="model-options-v2" value={form.modelo} placeholder="CG 160" onChange={(event) => updateField("modelo", event.target.value)} />
            </label>
            <label className="field-label">
              Ano{form.dispensa_queixa_principal ? "" : " *"}
              <input value={form.ano} inputMode="numeric" placeholder="2024" onChange={(event) => updateField("ano", event.target.value.replace(/\D/g, "").slice(0, 4))} />
            </label>
            <label className="field-label">
              Cor
              <input
                list="color-options-v2"
                value={form.cor}
                placeholder="Preta"
                onChange={(event) => updateField("cor", event.target.value)}
                style={
                  colorFieldTheme
                    ? {
                        background: colorFieldTheme.background,
                        color: colorFieldTheme.color,
                        borderColor: colorFieldTheme.border,
                      }
                    : undefined
                }
              />
            </label>
          </div>

          <div className="field-grid two-up">
            <label className="field-label">
              Placa *
              <input value={form.placa} placeholder="ABC1D23" onChange={(event) => updateField("placa", formatPlate(event.target.value))} />
            </label>
            <label className="field-label">
              KM
              <input value={form.km} placeholder="23500" onChange={(event) => updateField("km", event.target.value.replace(/\D/g, ""))} />
            </label>
          </div>

          {form.buscar_moto ? (
            <div className="field-grid four-up">
              <label className="field-label">
                Rua *
                <input value={form.endereco_retirada_rua} placeholder="Rua das Flores" onChange={(event) => updateField("endereco_retirada_rua", event.target.value)} />
              </label>
              <label className="field-label">
                Numero *
                <input
                  value={form.endereco_retirada_numero}
                  placeholder="123"
                  onChange={(event) => updateField("endereco_retirada_numero", event.target.value)}
                />
              </label>
              <label className="field-label">
                Bairro *
                <input value={form.endereco_retirada_bairro} placeholder="Centro" onChange={(event) => updateField("endereco_retirada_bairro", event.target.value)} />
              </label>
              <label className="field-label">
                Cidade *
                <input value={form.endereco_retirada_cidade} placeholder="Sao Paulo" onChange={(event) => updateField("endereco_retirada_cidade", event.target.value)} />
              </label>
            </div>
          ) : null}

          {!form.dispensa_queixa_principal ? (
            <label className="field-label">
              Queixa principal *
              <textarea
                value={form.queixa_principal}
                placeholder="Ex.: Moto falhando em alta rotacao"
                onChange={(event) => updateField("queixa_principal", event.target.value)}
              />
            </label>
          ) : (
            <p className="field-note">Servico rapido ativo: a OS pode seguir sem queixa principal e sem fotos, mas ainda exige servico ou peca informado.</p>
          )}

          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Servicos e pecas</p>
              <h2>Lista simples</h2>
              <p className="subtitle">
                Cada linha recebe descricao, qtd, valor e status de pagamento{form.dispensa_queixa_principal ? ". No modo rapido, este bloco continua obrigatorio." : "."}
              </p>
            </div>
            <button type="button" className="icon-button add-line-toolbar-button" onClick={addItem} aria-label="Adicionar linha" title="Adicionar linha">
              <AppIcon name="plus" size={16} />
            </button>
          </div>

          <div className="service-list-card">
            {form.items.map((item, index) => (
              <div className="service-line recepcao-service-line" key={`item-form-${index}`}>
                <span className="service-line-index">{String(index + 1).padStart(2, "0")}</span>
                <input
                  className="service-line-input"
                  list="service-options-v2"
                  value={item.descricao}
                  placeholder="Ex.: Troca de oleo, limpeza de carburador, pastilha de freio"
                  onFocus={() => {
                    void loadItemSuggestions(item.descricao).catch(() => {});
                  }}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    updateItem(index, "descricao", nextValue);
                    if (!nextValue || nextValue.length >= 2) {
                      void loadItemSuggestions(nextValue).catch(() => {});
                      }
                    }}
                />
                <input
                  value={item.quantidade}
                  inputMode="numeric"
                  placeholder="Qtd"
                  onChange={(event) => updateItem(index, "quantidade", event.target.value.replace(/\D/g, ""))}
                />
                <input
                  value={item.valor_unitario}
                  inputMode="decimal"
                  placeholder="Unit."
                  onChange={(event) => updateItem(index, "valor_unitario", normalizeCurrencyInput(event.target.value))}
                />
                <input
                  value={item.valor_total}
                  placeholder="Total"
                  readOnly
                />
                <button
                  type="button"
                  className={`icon-button payment-toggle ${item.pagamento_status === "PAGO" ? "is-paid" : "is-pending"}`}
                  onClick={() => toggleItemPayment(index)}
                  aria-label={item.pagamento_status === "PAGO" ? "Marcar como pendente" : "Marcar como pago"}
                  title={item.pagamento_status === "PAGO" ? "Servico pago" : "Servico pendente"}
                >
                  <AppIcon name="money" size={18} />
                </button>
                <button
                  type="button"
                  className={`icon-button danger-card-button inline-delete-button ${form.items.length === 1 ? "is-disabled" : ""}`}
                  onClick={() => removeItem(index)}
                  aria-label="Remover linha"
                  title={form.items.length === 1 ? "A lista precisa ter ao menos uma linha" : "Remover linha"}
                  disabled={form.items.length === 1}
                >
                  <AppIcon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
          <p className="field-note">
            {form.items.filter((item) => item.descricao.trim()).length} item(ns) na lista • Previsao inicial de R$ {toMoney(totalPrevioItens)}
          </p>

          {!form.dispensa_queixa_principal ? (
            <>
              <div className="field-grid">
                <label className="field-label">
                  Fotos iniciais
                  <input
                    ref={photoInputRef}
                    className="sr-only-file-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={(event) => {
                      appendFotos(Array.from(event.target.files || []));
                      event.target.value = "";
                    }}
                  />
                  <button type="button" className="photo-capture-button" onClick={() => photoInputRef.current?.click()}>
                    <span className="photo-capture-plus">+</span>
                    <span className="photo-capture-copy">
                      <strong>Adicionar fotos</strong>
                      <small>Toque para abrir a camera ou a galeria do aparelho.</small>
                    </span>
                  </button>
                  <span className="field-note">{fotosEntrada.length} arquivo(s) selecionado(s).</span>
                </label>
              </div>

              {fotosEntrada.length ? (
                <div className="photo-queue">
                  {fotosEntrada.map((file, index) => (
                    <div className="photo-chip" key={`${file.name}-${file.size}-${index}`}>
                      <span>{file.name}</span>
                      <button type="button" onClick={() => removeFoto(index)} aria-label={`Remover ${file.name}`}>
                        <AppIcon name="close" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          <div className="button-row">
            <button
              type="button"
              className="primary-button full-width"
              onClick={handleOpenConfirm}
              disabled={sending}
            >
              <AppIcon name="send" size={18} />
              Abrir ordem de servico
            </button>
          </div>
        </form>
      </div>
      ) : null}

      <Modal
        open={motoChoiceOpen}
        onClose={() => setMotoChoiceOpen(false)}
        title="Escolher moto do cliente"
        subtitle="Encontramos mais de uma moto vinculada a este CPF."
      >
        <div className="selection-grid">
          {motosAssociadas.map((moto) => (
            <button key={moto.id} type="button" className="selection-card" onClick={() => applyMotoToForm(moto)}>
              <strong>
                {moto.modelo}
                {moto.ano ? ` ${moto.ano}` : ""}
              </strong>
              <p>{moto.placa || "Sem placa"}</p>
            </button>
          ))}
          <button type="button" className="selection-card" onClick={clearMotoSelection}>
            <strong>Nova moto</strong>
            <p>Cadastrar outra motocicleta para este cliente</p>
          </button>
        </div>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => !sending && setConfirmOpen(false)}
        title="Confirmar abertura"
        subtitle="Confira os dados e confirme a criacao da ordem de servico."
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Voltar
            </button>
            <button type="button" className="primary-button" onClick={() => void handleConfirmSubmit()} disabled={sending}>
              {sending ? "Abrindo..." : "Confirmar abertura"}
            </button>
          </>
        }
      >
        <div className="summary-grid">
          <article className="detail-row">
            <strong>Cliente</strong>
            <p>{form.nome}</p>
          </article>
          <article className="detail-row">
            <strong>Moto</strong>
            <p>
              {form.marca} {form.modelo} {form.ano ? ` ${form.ano}` : ""} {form.placa ? `- ${form.placa}` : ""}
            </p>
          </article>
          <article className="detail-row">
            <strong>Queixa</strong>
            <p>{form.dispensa_queixa_principal ? "Dispensada no servico rapido" : form.queixa_principal}</p>
          </article>
          <article className="detail-row">
            <strong>Itens</strong>
            <p>
              {form.items.filter((item) => item.descricao.trim()).length} linha(s) • R$ {toMoney(totalPrevioItens)}
            </p>
          </article>
        </div>
        {error ? <p className="form-error modal-inline-error">{error}</p> : null}
      </Modal>

      <Modal
        open={duplicateOrderModal.open}
        onClose={() => setDuplicateOrderModal({ open: false, message: "", plate: "" })}
        title="Moto ja esta em atendimento"
        subtitle="Este CPF pode ter outras motos, mas esta mesma moto ja possui uma ordem ativa."
        size="small"
        actions={
          <>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setDuplicateOrderModal({ open: false, message: "", plate: "" })}
            >
              Fechar
            </button>
            <button type="button" className="primary-button" onClick={openProntuarioForCurrentPlate}>
              Abrir prontuario
            </button>
          </>
        }
      >
        <div className="modal-stack">
          <article className="detail-row">
            <strong>Orientacao</strong>
            <p>{duplicateOrderModal.message}</p>
          </article>
          <article className="detail-row">
            <strong>Proximo passo</strong>
            <p>Abra o prontuario desta moto para alterar a ordem existente ou adicionar novos servicos.</p>
          </article>
        </div>
      </Modal>

      <Modal
        open={Boolean(successData)}
        onClose={resetForNewOrder}
        title="OS aberta"
        subtitle="A ordem de servico foi criada com sucesso."
        size="small"
        actions={
          <button type="button" className="primary-button" onClick={resetForNewOrder}>
            Fechar
          </button>
        }
      >
        {successData ? (
          <div className="modal-stack">
            <article className="detail-row">
              <strong>Numero</strong>
              <p>{successData.numero_os}</p>
            </article>
            <article className="detail-row">
              <strong>Cliente</strong>
              <p>{successData.cliente_nome}</p>
            </article>
            <article className="detail-row">
              <strong>Moto</strong>
              <p>
                {successData.motocicleta_modelo} - {successData.motocicleta_placa}
              </p>
            </article>
            <article className="detail-row">
              <strong>Fotos iniciais</strong>
              <p>{successData.fotos_entrada} registrada(s)</p>
            </article>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

export default RecepcaoV2Page;
