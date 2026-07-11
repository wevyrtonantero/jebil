import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppIcon from "../components/common/AppIcon";
import { listClientes } from "../services/clienteService";
import { listMotocicletas, listMotocicletasByCliente } from "../services/motocicletaService";
import {
  generateAssinaturaRecebimentoPdfV2,
  getOrdemServicoV2,
  getProntuarioMotocicletaV2,
  listOrdensServicoV2,
} from "../services/ordemServicoV2Service";
import { formatCpf, formatPhone, formatPlate } from "../utils/formatters";
import { resolveApiOrigin } from "../utils/apiUrls";

const SEARCH_OPTIONS = [
  { id: "placa", label: "Placa" },
  { id: "cpf", label: "CPF" },
  { id: "nome", label: "Nome" },
  { id: "os", label: "Numero da OS" },
  { id: "externo", label: "Numero externo" },
];

function readCollection(response) {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
}

function normalizeExternalNumber(value = "") {
  const normalized = String(value || "").replace(/\s+/g, "").replace(/^#+/, "");
  return normalized ? `#${normalized}` : "";
}

function normalizeOsNumber(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .trim();
}

function getSearchPlaceholder(mode) {
  if (mode === "cpf") {
    return "000.000.000-00";
  }

  if (mode === "nome") {
    return "Digite o nome do cliente";
  }

  if (mode === "os") {
    return "OS-2026-000075";
  }

  if (mode === "externo") {
    return "#12345";
  }

  return "ABC1D23";
}

function formatSearchValue(mode, value) {
  if (mode === "placa") {
    return formatPlate(value);
  }

  if (mode === "cpf") {
    return formatCpf(value);
  }

  if (mode === "os") {
    return normalizeOsNumber(value);
  }

  if (mode === "externo") {
    return normalizeExternalNumber(value);
  }

  return value;
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

function extractDateParts(value) {
  if (!value) {
    return null;
  }

  const rawValue = String(value).trim();
  const hasExplicitTimezone = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(rawValue);
  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);

  if (match && !hasExplicitTimezone) {
    return {
      year: match[1],
      month: match[2],
      day: match[3],
      hour: match[4],
      minute: match[5],
    };
  }

  const parsedDate = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const formattedParts = Object.fromEntries(
    formatter
      .formatToParts(parsedDate)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: formattedParts.year,
    month: formattedParts.month,
    day: formattedParts.day,
    hour: formattedParts.hour,
    minute: formattedParts.minute,
  };
}

function formatReportDate(value) {
  const parts = extractDateParts(value);

  if (!parts) {
    return "Nao informado";
  }

  return `${parts.day}/${parts.month}/${parts.year}`;
}

function formatReportDateTime(value) {
  const parts = extractDateParts(value);

  if (!parts) {
    return "Nao informado";
  }

  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

function addDaysToDate(value, days) {
  if (!value) {
    return null;
  }

  const rawValue = String(value).trim();
  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);

  if (match && !/(?:[zZ]|[+-]\d{2}:\d{2})$/.test(rawValue)) {
    const [, year, month, day, hour, minute, second = "00"] = match;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return new Date(parsedDate.getTime() + days * 24 * 60 * 60 * 1000);
  }

  const parsedDate = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Date(parsedDate.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatWarrantyCountdown(endValue, nowTs) {
  const endDate = endValue instanceof Date ? endValue : new Date(endValue);

  if (Number.isNaN(endDate.getTime())) {
    return "Nao iniciado";
  }

  const diffMs = endDate.getTime() - nowTs;
  const isExpired = diffMs < 0;
  const totalHours = Math.floor(Math.abs(diffMs) / 3600000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const label = `${days}d ${hours}h`;

  return isExpired ? `Expirada ha ${label}` : `${label} restantes`;
}

function isWarrantyExpired(endValue, nowTs) {
  const endDate = endValue instanceof Date ? endValue : new Date(endValue);

  if (Number.isNaN(endDate.getTime())) {
    return false;
  }

  return endDate.getTime() < nowTs;
}

function formatDaysSinceLabel(value, nowTs) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponivel";
  }

  const diffMs = Math.max(0, nowTs - date.getTime());
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (days === 0) {
    return "Hoje";
  }

  if (days === 1) {
    return "Ha 1 dia";
  }

  return `Ha ${days} dias`;
}

function toMoney(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getLatestOrcamento(ordem) {
  return [...(ordem.orcamentos || [])].sort((left, right) => {
    if (left.versao_numero !== right.versao_numero) {
      return Number(right.versao_numero) - Number(left.versao_numero);
    }

    return Number(right.id) - Number(left.id);
  })[0] || null;
}

function getLatestDiagnostico(ordem) {
  return [...(ordem.diagnosticos || [])].sort((left, right) => Number(right.id) - Number(left.id))[0] || null;
}

function getReceiptRecord(ordem) {
  return ordem?.assinatura_recebimento || null;
}

function getLatestServiceDate(services = [], ordem = {}) {
  const dates = services
    .map((service) => service.dataServico)
    .filter(Boolean)
    .map((value) => {
      const parts = extractDateParts(value);

      if (!parts) {
        return null;
      }

      const sortable = `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}`;
      return {
        sortable,
        original: value,
      };
    })
    .filter(Boolean)
    .sort((left, right) => right.sortable.localeCompare(left.sortable));

  if (dates.length) {
    return dates[0].original;
  }

  return ordem.pronta_retirada_em || ordem.finalizada_em || ordem.atualizado_em || ordem.aberta_em || null;
}

function getExecutionLabel(execucao) {
  const names = (execucao?.mecanicos || []).map((mecanico) => mecanico.mecanico_nome).filter(Boolean);

  if (names.length) {
    return names.join(", ");
  }

  return execucao?.mecanico_principal_nome || "Nao informado";
}

function buildSearchCandidate(base = {}) {
  return {
    motocicleta_id: base.motocicleta_id,
    cliente_id: base.cliente_id || null,
    cliente_nome: base.cliente_nome || "Cliente",
    cliente_cpf: base.cliente_cpf || "",
    cliente_telefone: base.cliente_telefone || "",
    motocicleta_marca: base.motocicleta_marca || "",
    motocicleta_modelo: base.motocicleta_modelo || "",
    motocicleta_ano: base.motocicleta_ano || "",
    motocicleta_cor: base.motocicleta_cor || "",
    motocicleta_placa: base.motocicleta_placa || "",
    highlight_order_id: base.highlight_order_id || null,
    numero_externo: base.numero_externo || "",
    match_label: base.match_label || "",
  };
}

function dedupeCandidates(items = []) {
  const registry = new Map();

  items.forEach((item) => {
    const key = `${item.motocicleta_id}:${item.highlight_order_id || "base"}`;

    if (!registry.has(key)) {
      registry.set(key, item);
    }
  });

  return [...registry.values()];
}

function buildProntuarioEntries(ordensServico = [], highlightOrderId = null) {
  const entries = ordensServico.map((ordem) => {
    const latestOrcamento = getLatestOrcamento(ordem);
    const latestDiagnostico = getLatestDiagnostico(ordem);
    const services = (ordem.items || [])
      .filter((item) => item.descricao && item.descricao !== "Diagnostico inicial")
      .map((item) => {
        const execucao = (ordem.execucoes || []).find((current) => Number(current.item_ordem_servico_id) === Number(item.id));
        const garantia = (ordem.garantias || []).find((current) => Number(current.item_ordem_servico_id) === Number(item.id)) || null;
        const fallbackWarrantyEnd = addDaysToDate(item.concluido_em || item.iniciado_em || item.atualizado_em || ordem.atualizado_em, 90);

        return {
          id: item.id,
          descricao: item.descricao,
          status: item.status_item,
          pagamento: item.pagamento_status,
          executadoPor: getExecutionLabel(execucao),
          observacao: execucao?.descricao_execucao || item.observacoes || "",
          dataServico: item.concluido_em || item.iniciado_em || item.atualizado_em || ordem.atualizado_em,
          garantiaFim: garantia?.fim_garantia_em || fallbackWarrantyEnd,
        };
      });

    return {
      id: ordem.id,
      numeroOs: ordem.numero_os,
      status: ordem.status_geral,
      entradaEm: ordem.aberta_em,
      saidaEm: ordem.pronta_retirada_em || ordem.finalizada_em || ordem.atualizado_em,
      prazoEntrega: ordem.data_prometida,
      queixa: ordem.queixa_principal || "Nao informada",
      diagnostico: latestDiagnostico?.causa_identificada || latestDiagnostico?.descricao_tecnica || "",
      numeroExterno: latestOrcamento?.numero_externo || "",
      valorOrcamento: latestOrcamento?.valor_total || 0,
      orcamentoItems: latestOrcamento?.items || [],
      assinaturaRecebimento: getReceiptRecord(ordem),
      assinaturaRecebimentoPdfUrl: getPublicAssetUrl(getReceiptRecord(ordem)?.pdf_url),
      fotosEntrada: (ordem.fotos_entrada || []).map((foto) => ({
        id: foto.id,
        nomeArquivo: foto.nome_arquivo,
        criadoEm: foto.criado_em,
        url: getPublicAssetUrl(foto.arquivo_url),
      })),
      dataServico: getLatestServiceDate(services, ordem),
      garantiaFimOs: addDaysToDate(getLatestServiceDate(services, ordem), 90),
      services,
      highlighted: Number(ordem.id) === Number(highlightOrderId),
    };
  });

  if (!highlightOrderId) {
    return entries;
  }

  return [...entries].sort((left, right) => {
    if (left.highlighted && !right.highlighted) {
      return -1;
    }

    if (!left.highlighted && right.highlighted) {
      return 1;
    }

    return 0;
  });
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ProntuarioV2Page() {
  const [searchParams] = useSearchParams();
  const [searchMode, setSearchMode] = useState("placa");
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prontuario, setProntuario] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedContext, setSelectedContext] = useState(null);
  const [highlightOrderId, setHighlightOrderId] = useState(null);
  const [activeEntryId, setActiveEntryId] = useState(null);
  const [photosVisibleForEntryId, setPhotosVisibleForEntryId] = useState(null);
  const [actionBusyOrderId, setActionBusyOrderId] = useState(null);
  const [autoSearchPlate, setAutoSearchPlate] = useState("");
  const [clockNow, setClockNow] = useState(() => Date.now());

  const reportEntries = useMemo(
    () => buildProntuarioEntries(prontuario?.ordens_servico || [], highlightOrderId),
    [highlightOrderId, prontuario],
  );

  const activeEntry = useMemo(
    () => reportEntries.find((entry) => Number(entry.id) === Number(activeEntryId)) || null,
    [activeEntryId, reportEntries],
  );

  const headerExternalNumber = activeEntry?.numeroExterno || reportEntries[0]?.numeroExterno || selectedContext?.numero_externo || "-";

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockNow(Date.now());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!reportEntries.length) {
      setActiveEntryId(null);
      setPhotosVisibleForEntryId(null);
      return;
    }

    if (activeEntryId && !reportEntries.some((entry) => Number(entry.id) === Number(activeEntryId))) {
      setActiveEntryId(null);
      setPhotosVisibleForEntryId(null);
    }
  }, [activeEntryId, reportEntries]);

  useEffect(() => {
    const placaFromQuery = formatPlate(searchParams.get("placa") || "");

    if (!placaFromQuery) {
      return;
    }

    setSearchMode("placa");
    setSearchValue(placaFromQuery);
    setAutoSearchPlate(placaFromQuery);
  }, [searchParams]);

  useEffect(() => {
    if (!autoSearchPlate || autoSearchPlate !== searchValue) {
      return;
    }

    void handleSearch().finally(() => {
      setAutoSearchPlate("");
    });
  }, [autoSearchPlate, searchValue]);

  async function openProntuario(candidate) {
    setLoading(true);
    setError("");
    setSearchResults([]);

    try {
      const data = await getProntuarioMotocicletaV2(candidate.motocicleta_id);
      setProntuario(data);
      setSelectedContext(candidate);
      setHighlightOrderId(candidate.highlight_order_id || null);
      setActiveEntryId(candidate.highlight_order_id || null);
      setPhotosVisibleForEntryId(null);
    } catch (requestError) {
      setProntuario(null);
      setError(requestError?.response?.data?.message || "Nao foi possivel carregar o prontuario.");
    } finally {
      setLoading(false);
    }
  }

  async function resolveCandidatesByClientes(clientes = []) {
    const motoLists = await Promise.all(
      clientes.map(async (cliente) => {
        const motocicletas = await listMotocicletasByCliente(cliente.id);

        return motocicletas.map((moto) =>
          buildSearchCandidate({
            motocicleta_id: moto.id,
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            cliente_cpf: cliente.cpf,
            cliente_telefone: cliente.telefone,
            motocicleta_marca: moto.marca,
            motocicleta_modelo: moto.modelo,
            motocicleta_ano: moto.ano,
            motocicleta_cor: moto.cor,
            motocicleta_placa: moto.placa,
          }),
        );
      }),
    );

    return dedupeCandidates(motoLists.flat());
  }

  async function handleSearch() {
    setLoading(true);
    setError("");
    setProntuario(null);
    setSearchResults([]);
    setSelectedContext(null);
    setHighlightOrderId(null);
    setActiveEntryId(null);
    setPhotosVisibleForEntryId(null);

    try {
      let candidates = [];

      if (searchMode === "placa") {
        const response = await listMotocicletas({ placa: formatPlate(searchValue), limit: 12 });
        candidates = readCollection(response).map((moto) =>
          buildSearchCandidate({
            motocicleta_id: moto.id,
            cliente_id: moto.cliente_id,
            cliente_nome: moto.cliente_nome,
            cliente_cpf: moto.cliente_cpf,
            cliente_telefone: moto.cliente_telefone,
            motocicleta_marca: moto.marca,
            motocicleta_modelo: moto.modelo,
            motocicleta_ano: moto.ano,
            motocicleta_cor: moto.cor,
            motocicleta_placa: moto.placa,
          }),
        );
      }

      if (searchMode === "cpf") {
        const response = await listClientes({ cpf: formatCpf(searchValue), limit: 12 });
        candidates = await resolveCandidatesByClientes(readCollection(response));
      }

      if (searchMode === "nome") {
        const response = await listClientes({ nome: String(searchValue || "").trim(), limit: 20 });
        candidates = await resolveCandidatesByClientes(readCollection(response));
      }

      if (searchMode === "os") {
        const response = await listOrdensServicoV2({ numeroOs: normalizeOsNumber(searchValue) });
        const details = (
          await Promise.all(
            readCollection(response).map(async (ordem) => {
              try {
                return await getOrdemServicoV2(ordem.id);
              } catch {
                return null;
              }
            }),
          )
        ).filter(Boolean);

        candidates = details.map((ordem) =>
          buildSearchCandidate({
            motocicleta_id: ordem.motocicleta_id,
            cliente_id: ordem.cliente_id,
            cliente_nome: ordem.cliente_nome,
            cliente_cpf: ordem.cliente_cpf,
            cliente_telefone: ordem.cliente_telefone,
            motocicleta_marca: ordem.motocicleta_marca,
            motocicleta_modelo: ordem.motocicleta_modelo,
            motocicleta_ano: ordem.motocicleta_ano,
            motocicleta_cor: ordem.motocicleta_cor,
            motocicleta_placa: ordem.motocicleta_placa,
            highlight_order_id: ordem.id,
            numero_externo: getLatestOrcamento(ordem)?.numero_externo || "",
            match_label: ordem.numero_os,
          }),
        );
      }

      if (searchMode === "externo") {
        const targetNumber = normalizeExternalNumber(searchValue);
        const ordens = await listOrdensServicoV2();
        const details = (
          await Promise.all(
            ordens.map(async (ordem) => {
              try {
                return await getOrdemServicoV2(ordem.id);
              } catch {
                return null;
              }
            }),
          )
        ).filter(Boolean);

        candidates = details
          .filter((ordem) =>
            (ordem.orcamentos || []).some((orcamento) =>
              String(orcamento.numero_externo || "").toUpperCase().includes(targetNumber.toUpperCase()),
            ),
          )
          .map((ordem) =>
            buildSearchCandidate({
              motocicleta_id: ordem.motocicleta_id,
              cliente_id: ordem.cliente_id,
              cliente_nome: ordem.cliente_nome,
              cliente_cpf: ordem.cliente_cpf,
              cliente_telefone: ordem.cliente_telefone,
              motocicleta_marca: ordem.motocicleta_marca,
              motocicleta_modelo: ordem.motocicleta_modelo,
              motocicleta_ano: ordem.motocicleta_ano,
              motocicleta_cor: ordem.motocicleta_cor,
              motocicleta_placa: ordem.motocicleta_placa,
              highlight_order_id: ordem.id,
              numero_externo: getLatestOrcamento(ordem)?.numero_externo || "",
              match_label: getLatestOrcamento(ordem)?.numero_externo || "",
            }),
          );
      }

      const uniqueCandidates = dedupeCandidates(candidates);

      if (!uniqueCandidates.length) {
        setError("Nenhum prontuario encontrado com este filtro.");
        return;
      }

      if (uniqueCandidates.length === 1) {
        await openProntuario(uniqueCandidates[0]);
        return;
      }

      setSearchResults(uniqueCandidates);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel pesquisar o prontuario.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenEntry(entryId) {
    setActiveEntryId(entryId);
    setPhotosVisibleForEntryId(null);
  }

  function handleCloseEntry() {
    setActiveEntryId(null);
    setPhotosVisibleForEntryId(null);
  }

  function replaceOrdemInProntuario(ordemAtualizada) {
    setProntuario((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        ordens_servico: (current.ordens_servico || []).map((ordem) =>
          Number(ordem.id) === Number(ordemAtualizada.id) ? ordemAtualizada : ordem,
        ),
      };
    });
  }

  async function handleOpenReceiptPdf(entry) {
    if (!entry?.assinaturaRecebimento) {
      return;
    }

    let pdfUrl = entry.assinaturaRecebimentoPdfUrl;

    if (!pdfUrl) {
      setActionBusyOrderId(entry.id);
      setError("");

      try {
        const ordemAtualizada = await generateAssinaturaRecebimentoPdfV2(entry.id);
        replaceOrdemInProntuario(ordemAtualizada);
        pdfUrl = getPublicAssetUrl(ordemAtualizada?.assinatura_recebimento?.pdf_url);
      } catch (requestError) {
        setError(requestError?.response?.data?.message || "Nao foi possivel gerar o PDF do contrato.");
      } finally {
        setActionBusyOrderId(null);
      }
    }

    if (pdfUrl) {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    }
  }

  function handlePrint() {
    if (!prontuario || !activeEntry) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=1080,height=720");

    if (!printWindow) {
      return;
    }

    const headerMoto = [
      prontuario.motocicleta_marca,
      prontuario.motocicleta_modelo,
      prontuario.motocicleta_ano,
      prontuario.motocicleta_cor,
    ]
      .filter(Boolean)
      .join(" ");

    const entryHtml = `
      <section style="padding:18px 0;border-top:1px solid #d8dde8;">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;">
          <div>
            <h2 style="margin:0 0 8px;font-size:20px;">${escapeHtml(activeEntry.numeroOs)}</h2>
            <p style="margin:4px 0;"><strong>Entrada:</strong> ${escapeHtml(formatReportDateTime(activeEntry.entradaEm))}</p>
            <p style="margin:4px 0;"><strong>Saida:</strong> ${escapeHtml(formatReportDateTime(activeEntry.saidaEm))}</p>
            <p style="margin:4px 0;"><strong>Garantia:</strong> 3 meses</p>
            <p style="margin:4px 0;"><strong>Tempo restante:</strong> ${escapeHtml(formatWarrantyCountdown(activeEntry.garantiaFimOs, clockNow))}</p>
            <p style="margin:4px 0;"><strong>Queixa:</strong> ${escapeHtml(activeEntry.queixa)}</p>
            ${activeEntry.diagnostico ? `<p style="margin:4px 0;"><strong>Diagnostico:</strong> ${escapeHtml(activeEntry.diagnostico)}</p>` : ""}
          </div>
          <div style="text-align:right;">
            <p style="margin:4px 0;"><strong>Status:</strong> ${escapeHtml(activeEntry.status)}</p>
            <p style="margin:4px 0;"><strong>Numero externo:</strong> ${escapeHtml(activeEntry.numeroExterno || "-")}</p>
            <p style="margin:4px 0;"><strong>Total:</strong> R$ ${escapeHtml(toMoney(activeEntry.valorOrcamento || 0))}</p>
          </div>
        </div>
        ${
          activeEntry.orcamentoItems.length
            ? `
              <table style="width:100%;border-collapse:collapse;margin-top:14px;">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:8px 0;border-bottom:1px solid #d8dde8;">Orcamento</th>
                    <th style="text-align:center;padding:8px 0;border-bottom:1px solid #d8dde8;">Qtd</th>
                    <th style="text-align:right;padding:8px 0;border-bottom:1px solid #d8dde8;">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeEntry.orcamentoItems
                    .map(
                      (item) => `
                        <tr>
                          <td style="padding:8px 0;border-bottom:1px solid #edf1f7;">${escapeHtml(item.descricao)}</td>
                          <td style="padding:8px 0;text-align:center;border-bottom:1px solid #edf1f7;">${escapeHtml(item.quantidade || "1")}</td>
                          <td style="padding:8px 0;text-align:right;border-bottom:1px solid #edf1f7;">R$ ${escapeHtml(toMoney(item.valor_total || 0))}</td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            `
            : ""
        }
        ${
          activeEntry.services.length
            ? `
              <table style="width:100%;border-collapse:collapse;margin-top:14px;">
                <thead>
                  <tr>
                    <th style="text-align:left;padding:8px 0;border-bottom:1px solid #d8dde8;">Servico</th>
                    <th style="text-align:left;padding:8px 0;border-bottom:1px solid #d8dde8;">Data do servico</th>
                    <th style="text-align:left;padding:8px 0;border-bottom:1px solid #d8dde8;">Executado ha</th>
                  </tr>
                </thead>
                <tbody>
                  ${activeEntry.services
                    .map(
                      (service) => `
                        <tr>
                          <td style="padding:8px 0;border-bottom:1px solid #edf1f7;">
                            ${escapeHtml(service.descricao)}
                            ${service.observacao ? `<div style="margin-top:4px;font-size:12px;color:#53627c;">${escapeHtml(service.observacao)}</div>` : ""}
                          </td>
                          <td style="padding:8px 0;border-bottom:1px solid #edf1f7;">${escapeHtml(formatReportDateTime(service.dataServico))}</td>
                          <td style="padding:8px 0;border-bottom:1px solid #edf1f7;">${escapeHtml(formatDaysSinceLabel(service.dataServico, clockNow))}</td>
                        </tr>
                      `,
                    )
                    .join("")}
                </tbody>
              </table>
            `
            : ""
        }
        ${
          activeEntry.assinaturaRecebimento
            ? `
              <div style="margin-top:16px;padding:14px;border:1px solid #d8dde8;border-radius:14px;background:#f7f9fc;">
                <p style="margin:0 0 8px;"><strong>${escapeHtml(activeEntry.assinaturaRecebimento.termo_titulo || "Termo de recebimento")}</strong></p>
                <p style="margin:4px 0 10px;"><strong>Assinado em:</strong> ${escapeHtml(formatReportDateTime(activeEntry.assinaturaRecebimento.assinado_em))}</p>
                <pre style="white-space:pre-wrap;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;margin:0 0 12px;">${escapeHtml(activeEntry.assinaturaRecebimento.termo_texto || "")}</pre>
                <img src="${activeEntry.assinaturaRecebimento.assinatura_data_url}" alt="Assinatura do cliente" style="max-width:320px;width:100%;border:1px solid #d8dde8;border-radius:12px;background:#081327;" />
              </div>
            `
            : ""
        }
      </section>
    `;

    printWindow.document.write(`
      <html lang="pt-BR">
        <head>
          <title>${escapeHtml(activeEntry.numeroOs)} - ${escapeHtml(prontuario.motocicleta_placa || "")}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #172033; padding: 28px; }
            h1 { margin: 0 0 10px; }
            p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <h1>Prontuario da OS ${escapeHtml(activeEntry.numeroOs)}</h1>
          <p><strong>Cliente:</strong> ${escapeHtml(prontuario.cliente_nome || "-")}</p>
          <p><strong>CPF:</strong> ${escapeHtml(prontuario.cliente_cpf || "-")}</p>
          <p><strong>Telefone:</strong> ${escapeHtml(prontuario.cliente_telefone || "-")}</p>
          <p><strong>Moto:</strong> ${escapeHtml(headerMoto || "-")}</p>
          <p><strong>Placa:</strong> ${escapeHtml(prontuario.motocicleta_placa || "-")}</p>
          ${entryHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <section className="page-section prontuario-report-page">
      <div className="panel-card prontuario-report-card">
        <div className="workspace-heading">
          <div className="title-with-icon">
            <span className="title-icon">
              <AppIcon name="motorcycle" />
            </span>
            <div>
              <p className="eyebrow">Prontuario</p>
              <h2>Relatorio da motocicleta</h2>
              <p className="subtitle">Pesquise por placa, CPF, nome, numero da OS ou numero externo para abrir o historico.</p>
            </div>
          </div>
        </div>

        <div className="prontuario-search-shell print-hidden">
          <div className="prontuario-filter-row">
            {SEARCH_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`toggle-chip ${searchMode === option.id ? "active" : ""}`}
                onClick={() => {
                  setSearchMode(option.id);
                  setSearchValue("");
                  setSearchResults([]);
                  setProntuario(null);
                  setSelectedContext(null);
                  setHighlightOrderId(null);
                  setActiveEntryId(null);
                  setPhotosVisibleForEntryId(null);
                  setError("");
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="prontuario-search-bar">
            <label className="field-label">
              {SEARCH_OPTIONS.find((option) => option.id === searchMode)?.label}
              <input
                value={searchValue}
                placeholder={getSearchPlaceholder(searchMode)}
                onChange={(event) => setSearchValue(formatSearchValue(searchMode, event.target.value))}
              />
            </label>

            <div className="button-row prontuario-search-actions">
              <button type="button" className="primary-button" onClick={handleSearch} disabled={loading || !searchValue.trim()}>
                {loading ? "Buscando..." : "Buscar"}
              </button>
            </div>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        {searchResults.length ? (
          <div className="table-list print-hidden">
            <div className="workspace-heading">
              <div>
                <h2>Resultados da busca</h2>
              </div>
            </div>

            {searchResults.map((candidate) => (
              <article className="row-card prontuario-result-row" key={`${candidate.motocicleta_id}-${candidate.highlight_order_id || "moto"}`}>
                <div>
                  <strong>{candidate.cliente_nome}</strong>
                  <p>
                    {[candidate.motocicleta_marca, candidate.motocicleta_modelo, candidate.motocicleta_ano].filter(Boolean).join(" ")}
                    {candidate.motocicleta_placa ? ` - ${candidate.motocicleta_placa}` : ""}
                  </p>
                  <small>
                    {candidate.match_label || candidate.cliente_cpf || "Sem identificacao"}
                    {candidate.numero_externo ? ` • ${candidate.numero_externo}` : ""}
                  </small>
                </div>
                <button type="button" className="ghost-button" onClick={() => void openProntuario(candidate)}>
                  Abrir
                </button>
              </article>
            ))}
          </div>
        ) : null}

        {prontuario ? (
          <article className="prontuario-document">
            <header className="prontuario-document-header">
              <div>
                <p className="eyebrow">Cabecalho</p>
                <h1>Prontuario da motocicleta</h1>
                <p className="prontuario-document-subtitle">
                  {[prontuario.motocicleta_marca, prontuario.motocicleta_modelo, prontuario.motocicleta_ano].filter(Boolean).join(" ")}
                  {prontuario.motocicleta_cor ? ` • ${prontuario.motocicleta_cor}` : ""}
                </p>
              </div>
              <div className="prontuario-document-header-side">
                <strong>{prontuario.motocicleta_placa || "Sem placa"}</strong>
                <span>{headerExternalNumber}</span>
              </div>
            </header>

            <section className="prontuario-document-meta">
              <div>
                <span>Cliente</span>
                <p>{prontuario.cliente_nome || "Nao informado"}</p>
              </div>
              <div>
                <span>CPF</span>
                <p>{prontuario.cliente_cpf || "Nao informado"}</p>
              </div>
              <div>
                <span>Telefone</span>
                <p>{prontuario.cliente_telefone ? formatPhone(prontuario.cliente_telefone) : "Nao informado"}</p>
              </div>
            </section>

            {!activeEntry ? (
              <div className="prontuario-report-list">
                <div className="prontuario-report-block">
                  <div className="prontuario-report-block-header">
                    <h3>Ordens de servico desta motocicleta</h3>
                  </div>
                  <div className="prontuario-order-list">
                    {reportEntries.map((entry) => (
                      <article className="prontuario-order-card" key={entry.id}>
                        <div className="prontuario-order-card-head">
                          <div>
                            <h2>{entry.numeroOs}</h2>
                            <p>{entry.numeroExterno || "Sem numero externo"}</p>
                          </div>
                          <div className="prontuario-report-badges">
                            <span className="badge badge-info">{entry.status}</span>
                          </div>
                        </div>

                        <div className="prontuario-order-card-grid">
                          <div>
                            <span>Data do servico</span>
                            <strong>{formatReportDate(entry.dataServico)}</strong>
                          </div>
                          <div>
                            <span>Tempo</span>
                            <strong>{formatDaysSinceLabel(entry.dataServico, clockNow)}</strong>
                          </div>
                        </div>

                        <div className="prontuario-order-card-grid">
                          <div>
                            <span>Servicos executados</span>
                            <strong>{entry.services.length}</strong>
                          </div>
                          <div>
                            <span>Fotos da OS</span>
                            <strong>{entry.fotosEntrada.length}</strong>
                          </div>
                        </div>

                        <div className="prontuario-order-card-actions">
                          <button type="button" className="primary-button" onClick={() => handleOpenEntry(entry.id)}>
                            Abrir OS
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {activeEntry ? (
              <div className="prontuario-order-detail">
                <section className="prontuario-report-entry is-highlighted">
                  <div className="prontuario-order-toolbar print-hidden">
                    {reportEntries.length > 1 ? (
                      <button type="button" className="ghost-button" onClick={handleCloseEntry}>
                        Voltar para as OS
                      </button>
                    ) : null}
                    <button type="button" className="ghost-button" onClick={handlePrint}>
                      <AppIcon name="printer" size={16} />
                      Imprimir esta OS
                    </button>
                    {activeEntry.fotosEntrada.length ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          setPhotosVisibleForEntryId((current) => (Number(current) === Number(activeEntry.id) ? null : activeEntry.id))
                        }
                      >
                        <AppIcon name="camera" size={16} />
                        {Number(photosVisibleForEntryId) === Number(activeEntry.id) ? "Ocultar fotos" : "Ver fotos da moto"}
                      </button>
                    ) : null}
                    {activeEntry.assinaturaRecebimento ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => void handleOpenReceiptPdf(activeEntry)}
                        disabled={Number(actionBusyOrderId) === Number(activeEntry.id)}
                      >
                        <AppIcon name="printer" size={16} />
                        {Number(actionBusyOrderId) === Number(activeEntry.id)
                          ? "Gerando PDF..."
                          : activeEntry.assinaturaRecebimentoPdfUrl
                            ? "Abrir PDF do contrato"
                            : "Gerar PDF do contrato"}
                      </button>
                    ) : null}
                  </div>

                  <div className="prontuario-report-head">
                    <div>
                      <h2>{activeEntry.numeroOs}</h2>
                      <p>
                        Entrada {formatReportDateTime(activeEntry.entradaEm)}
                        {" • "}
                        Saida {formatReportDateTime(activeEntry.saidaEm)}
                      </p>
                    </div>
                    <div className="prontuario-report-badges">
                      <span className="badge badge-info">{activeEntry.status}</span>
                      {activeEntry.numeroExterno ? <span className="badge badge-warning">{activeEntry.numeroExterno}</span> : null}
                    </div>
                  </div>

                  <div className="prontuario-report-grid">
                    <div>
                      <span>Queixa</span>
                      <p>{activeEntry.queixa}</p>
                    </div>
                    <div>
                      <span>Prazo</span>
                      <p>{formatReportDateTime(activeEntry.prazoEntrega)}</p>
                    </div>
                    <div>
                      <span>Data do servico</span>
                      <p>{formatReportDateTime(activeEntry.dataServico)}</p>
                    </div>
                    <div>
                      <span>Tempo do servico</span>
                      <p>{formatDaysSinceLabel(activeEntry.dataServico, clockNow)}</p>
                    </div>
                    <div>
                      <span>Garantia</span>
                      <p>3 meses</p>
                    </div>
                    <div>
                      <span>Tempo restante da garantia</span>
                      <p className={isWarrantyExpired(activeEntry.garantiaFimOs, clockNow) ? "error-text" : "success-text"}>
                        {formatWarrantyCountdown(activeEntry.garantiaFimOs, clockNow)}
                      </p>
                    </div>
                    <div>
                      <span>Total do orcamento</span>
                      <p>R$ {toMoney(activeEntry.valorOrcamento)}</p>
                    </div>
                  </div>

                  {activeEntry.diagnostico ? (
                    <div className="prontuario-report-block">
                      <span>Diagnostico</span>
                      <p>{activeEntry.diagnostico}</p>
                    </div>
                  ) : null}

                  {Number(photosVisibleForEntryId) === Number(activeEntry.id) ? (
                    <div className="prontuario-report-block">
                      <div className="prontuario-report-block-header">
                        <h3>Fotos da moto nesta OS</h3>
                      </div>
                      <div className="prontuario-photo-grid">
                        {activeEntry.fotosEntrada.map((foto) => (
                          <a className="prontuario-photo-card" href={foto.url} target="_blank" rel="noreferrer" key={`${activeEntry.id}-${foto.id}`}>
                            <img src={foto.url} alt={foto.nomeArquivo || `Foto da OS ${activeEntry.numeroOs}`} />
                            <div>
                              <strong>{foto.nomeArquivo || "Foto registrada"}</strong>
                              <small>{formatReportDateTime(foto.criadoEm)}</small>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {activeEntry.orcamentoItems.length ? (
                    <div className="prontuario-report-block">
                      <div className="prontuario-report-block-header">
                        <h3>Orcamento</h3>
                      </div>
                      <table className="prontuario-report-table">
                        <thead>
                          <tr>
                            <th>Descricao</th>
                            <th>Qtd</th>
                            <th>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeEntry.orcamentoItems.map((item) => (
                            <tr key={`${activeEntry.id}-${item.id}`}>
                              <td>{item.descricao}</td>
                              <td>{item.quantidade || "1"}</td>
                              <td>R$ {toMoney(item.valor_total || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}

                  {activeEntry.assinaturaRecebimento ? (
                    <div className="prontuario-report-block">
                      <div className="prontuario-report-block-header">
                        <h3>Termo assinado na recepcao</h3>
                      </div>
                      <div className="prontuario-receipt-grid">
                        <div className="prontuario-receipt-copy">
                          <span>Assinado em</span>
                          <p>{formatReportDateTime(activeEntry.assinaturaRecebimento.assinado_em)}</p>
                          <pre>{activeEntry.assinaturaRecebimento.termo_texto}</pre>
                        </div>
                        <div className="prontuario-receipt-signature">
                          <span>Assinatura</span>
                          <img src={activeEntry.assinaturaRecebimento.assinatura_data_url} alt={`Assinatura do cliente da OS ${activeEntry.numeroOs}`} />
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {activeEntry.services.length ? (
                    <div className="prontuario-report-block">
                      <div className="prontuario-report-block-header">
                        <h3>Execucao e historico</h3>
                      </div>
                      <table className="prontuario-report-table">
                        <thead>
                          <tr>
                            <th>Servico</th>
                            <th>Data do servico</th>
                            <th>Responsavel</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeEntry.services.map((service) => (
                            <tr key={`${activeEntry.id}-${service.id}`}>
                              <td>
                                <strong>{service.descricao}</strong>
                                {service.observacao ? <small>{service.observacao}</small> : null}
                              </td>
                              <td>{formatReportDateTime(service.dataServico)}</td>
                              <td>{service.executadoPor || "Nao informado"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </section>
              </div>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}

export default ProntuarioV2Page;
