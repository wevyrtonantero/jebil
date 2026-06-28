import { useMemo, useState } from "react";
import { createCliente, listClientes, updateCliente } from "../services/clienteService";
import { listAtendimentos } from "../services/atendimentoService";
import {
  createMotocicleta,
  listMotocicletas,
  listMotocicletasByCliente,
  updateMotocicleta,
  updateMotocicletaStatus,
} from "../services/motocicletaService";
import Modal from "../components/common/Modal";
import AppIcon from "../components/common/AppIcon";
import StatusBadge from "../components/common/StatusBadge";
import { brandOptions, getModelOptions } from "../data/motoCatalog";
import { formatCpf, formatPhone, formatPlate } from "../utils/formatters";

const initialSearch = {
  nome: "",
  cpf: "",
  placa: "",
  data_inicial: "",
  data_final: "",
};

const initialClienteForm = {
  nome: "",
  telefone: "",
  cpf: "",
  observacoes: "",
};

const initialMotoForm = {
  marca: "",
  modelo: "",
  cor: "",
  placa: "",
  km: "",
  observacoes: "",
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildClientMap(clientesResponse, motosResponse, atendimentos) {
  const map = new Map();

  const ensureItem = (id, fallbackNome = "Cliente") => {
    const key = id || fallbackNome;

    if (!map.has(key)) {
      map.set(key, {
        id,
        nome: fallbackNome,
        telefone: "",
        cpf: "",
        observacoes: "",
        motos: [],
        atendimentos: [],
      });
    }

    return map.get(key);
  };

  (clientesResponse?.data || []).forEach((cliente) => {
    const item = ensureItem(cliente.id, cliente.nome);
    item.nome = cliente.nome;
    item.telefone = cliente.telefone || "";
    item.cpf = cliente.cpf || "";
    item.observacoes = cliente.observacoes || "";
  });

  (motosResponse?.data || []).forEach((moto) => {
    const item = ensureItem(moto.cliente_id, moto.cliente_nome);
    item.id = moto.cliente_id;
    item.nome = moto.cliente_nome || item.nome;
    item.motos.push(moto);
  });

  atendimentos.forEach((atendimento) => {
    const item = ensureItem(atendimento.cliente_id, atendimento.cliente_nome);
    item.id = atendimento.cliente_id;
    item.nome = atendimento.cliente_nome || item.nome;
    item.telefone = atendimento.cliente_telefone || item.telefone;
    item.cpf = atendimento.cliente_cpf || item.cpf;
    item.atendimentos.push(atendimento);

    if (atendimento.motocicleta_id && !item.motos.some((moto) => moto.id === atendimento.motocicleta_id)) {
      item.motos.push({
        id: atendimento.motocicleta_id,
        cliente_id: atendimento.cliente_id,
        cliente_nome: atendimento.cliente_nome,
        marca: atendimento.motocicleta_marca || "",
        modelo: atendimento.motocicleta_modelo || "",
        placa: atendimento.motocicleta_placa || "",
      });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

function hasSearchFilters(filters) {
  return Boolean(filters.nome || filters.cpf || filters.placa || filters.data_inicial || filters.data_final);
}

function ClientesPage() {
  const [filters, setFilters] = useState(initialSearch);
  const [resultados, setResultados] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [clienteForm, setClienteForm] = useState(initialClienteForm);
  const [historico, setHistorico] = useState([]);
  const [motos, setMotos] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [motoModalOpen, setMotoModalOpen] = useState(false);
  const [motoTarget, setMotoTarget] = useState(null);
  const [motoForm, setMotoForm] = useState(initialMotoForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const modelosDisponiveis = useMemo(() => getModelOptions(motoForm.marca, motoForm.modelo), [motoForm.marca, motoForm.modelo]);
  const searchActive = useMemo(() => hasSearchFilters(filters), [filters]);

  async function loadSearch() {
    if (!hasSearchFilters(filters)) {
      setResultados([]);
      return;
    }

    const [clientesResponse, motosResponse, atendimentosData] = await Promise.all([
      listClientes({
        nome: filters.nome || undefined,
        cpf: filters.cpf || undefined,
        limit: 100,
        ativo: true,
      }),
      filters.placa
        ? listMotocicletas({
            placa: filters.placa,
            limit: 100,
            ativo: true,
          })
        : Promise.resolve({ data: [] }),
      listAtendimentos({
        cliente_nome: filters.nome || undefined,
        cliente_cpf: filters.cpf || undefined,
        placa: filters.placa || undefined,
        data_inicial: filters.data_inicial || undefined,
        data_final: filters.data_final || undefined,
      }),
    ]);

    setResultados(buildClientMap(clientesResponse, motosResponse, atendimentosData));
  }

  async function openClienteDetails(cliente) {
    if (!cliente?.id) {
      setError("Nao foi possivel abrir os detalhes deste cliente.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const [motosData, atendimentosData] = await Promise.all([
        listMotocicletasByCliente(cliente.id),
        listAtendimentos({
          cliente_cpf: cliente.cpf || undefined,
          cliente_nome: cliente.cpf ? undefined : cliente.nome,
        }),
      ]);

      setSelectedCliente(cliente);
      setClienteForm({
        nome: cliente.nome || "",
        telefone: cliente.telefone || "",
        cpf: cliente.cpf || "",
        observacoes: cliente.observacoes || "",
      });
      setMotos(motosData.filter((item) => item.ativo));
      setHistorico(
        atendimentosData
          .filter((item) => item.cliente_id === cliente.id || item.cliente_nome === cliente.nome)
          .sort((a, b) => new Date(b.finalizado_em || b.entrada_em) - new Date(a.finalizado_em || a.entrada_em)),
      );
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao carregar os detalhes do cliente.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshSelectedCliente() {
    if (!selectedCliente?.id) {
      return;
    }

    const clienteAtualizado = resultados.find((item) => item.id === selectedCliente.id) || selectedCliente;
    await openClienteDetails(clienteAtualizado);
  }

  async function handleCreateCliente(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await createCliente(clienteForm);
      setCreateOpen(false);
      setClienteForm(initialClienteForm);
      if (searchActive) {
        await loadSearch();
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao criar cliente.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCliente() {
    if (!selectedCliente?.id) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await updateCliente(selectedCliente.id, clienteForm);
      if (searchActive) {
        await loadSearch();
      }
      setSelectedCliente((current) => (current ? { ...current, ...clienteForm } : null));
      await refreshSelectedCliente();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao atualizar cliente.");
    } finally {
      setBusy(false);
    }
  }

  function openMotoModal(moto = null) {
    setMotoTarget(moto);
    setMotoForm(
      moto
        ? {
            marca: moto.marca || "",
            modelo: moto.modelo || "",
            cor: moto.cor || "",
            placa: moto.placa || "",
            km: moto.km || "",
            observacoes: moto.observacoes || "",
          }
        : initialMotoForm,
    );
    setMotoModalOpen(true);
  }

  async function handleSaveMoto() {
    if (!selectedCliente?.id) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const payload = {
        cliente_id: selectedCliente.id,
        marca: motoForm.marca || null,
        modelo: motoForm.modelo,
        cor: motoForm.cor || null,
        placa: motoForm.placa,
        km: motoForm.km || null,
        observacoes: motoForm.observacoes || null,
      };

      if (motoTarget?.id) {
        await updateMotocicleta(motoTarget.id, payload);
      } else {
        await createMotocicleta(payload);
      }

      setMotoModalOpen(false);
      setMotoTarget(null);
      if (searchActive) {
        await loadSearch();
      }
      await refreshSelectedCliente();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao salvar moto.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteMoto(motoId) {
    setBusy(true);
    setError("");

    try {
      await updateMotocicletaStatus(motoId, false);
      if (searchActive) {
        await loadSearch();
      }
      await refreshSelectedCliente();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao apagar moto.");
    } finally {
      setBusy(false);
    }
  }

  function handlePrintHistorico() {
    if (!selectedCliente) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=980,height=720");

    if (!printWindow) {
      return;
    }

    const servicosHtml = historico
      .map(
        (item) => `
          <article style="border:1px solid #d8dde8;border-radius:14px;padding:16px;margin-bottom:12px;">
            <strong style="display:block;font-size:18px;margin-bottom:8px;">${escapeHtml(item.motocicleta_modelo)}${item.motocicleta_placa ? ` • ${escapeHtml(item.motocicleta_placa)}` : ""}</strong>
            <p><strong>Entrada:</strong> ${escapeHtml(item.entrada_em || "-")}</p>
            <p><strong>Servico feito:</strong> ${escapeHtml(item.servico_executado || "Nao informado")}</p>
            <p><strong>Mecanico:</strong> ${escapeHtml(item.mecanico_nome || "Nao informado")}</p>
            <p><strong>Status:</strong> ${escapeHtml(item.status)}</p>
          </article>
        `,
      )
      .join("");

    printWindow.document.write(`
      <html lang="pt-BR">
        <head>
          <title>Historico do cliente</title>
          <style>
            body { font-family: Arial, sans-serif; color: #172033; padding: 32px; }
            h1 { margin-bottom: 8px; }
            p { margin: 4px 0; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(selectedCliente.nome)}</h1>
          <p><strong>Telefone:</strong> ${escapeHtml(selectedCliente.telefone || "-")}</p>
          <p><strong>CPF:</strong> ${escapeHtml(selectedCliente.cpf || "-")}</p>
          <hr style="margin: 20px 0;" />
          ${servicosHtml || "<p>Nenhum servico encontrado.</p>"}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <section className="page-section">
      <datalist id="clientes-brand-options">
        {brandOptions.map((brand) => (
          <option key={brand} value={brand} />
        ))}
      </datalist>
      <datalist id="clientes-model-options">
        {modelosDisponiveis.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>

      <div className="clients-page-layout">
        <div className="workspace-card clients-search-card">
          <div className="workspace-heading">
            <div className="title-with-icon">
              <span className="title-icon">
                <AppIcon name="search" />
              </span>
              <div>
                <p className="eyebrow">Consulta</p>
                <h2>Buscar clientes e historico</h2>
                <p className="subtitle">Pesquise por nome, CPF ou placa. No detalhe voce edita o cadastro, as motos e imprime o historico.</p>
              </div>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setClienteForm(initialClienteForm);
                setCreateOpen(true);
              }}
            >
              Novo cliente
            </button>
          </div>

          <div className="field-grid clients-search-grid">
            <label className="field-label">
              Nome
              <input value={filters.nome} onChange={(event) => setFilters((current) => ({ ...current, nome: event.target.value }))} />
            </label>
            <label className="field-label">
              CPF
              <input value={filters.cpf} onChange={(event) => setFilters((current) => ({ ...current, cpf: formatCpf(event.target.value) }))} />
            </label>
            <label className="field-label">
              Placa
              <input value={filters.placa} onChange={(event) => setFilters((current) => ({ ...current, placa: formatPlate(event.target.value) }))} />
            </label>
            <label className="field-label">
              Data inicial
              <input type="date" value={filters.data_inicial} onChange={(event) => setFilters((current) => ({ ...current, data_inicial: event.target.value }))} />
            </label>
            <label className="field-label">
              Data final
              <input type="date" value={filters.data_final} onChange={(event) => setFilters((current) => ({ ...current, data_final: event.target.value }))} />
            </label>
          </div>

          <div className="button-row clients-search-actions">
            <button type="button" className="primary-button" onClick={() => loadSearch().catch(() => {})}>
              Buscar
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setFilters(initialSearch);
                void loadSearch().catch(() => {});
              }}
            >
              Limpar filtros
            </button>
            <span className="clients-search-hint">
              {searchActive ? `${resultados.length} cliente(s) encontrado(s)` : "Preencha um filtro para pesquisar"}
            </span>
          </div>

          {error ? <p className="form-error">{error}</p> : null}
        </div>

        <div className="workspace-card clients-results-card">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Resultados</p>
              <h2>Clientes encontrados</h2>
              <p className="subtitle">Clique em um cliente para abrir motos, historico e impressao.</p>
            </div>
          </div>

          <div className="clients-result-grid">
            {resultados.map((cliente) => (
              <article className="row-card client-result-card" key={cliente.id || cliente.nome}>
                <div className="client-result-copy">
                  <strong>{cliente.nome}</strong>
                  <p>{cliente.cpf || "Sem CPF"}</p>
                  <small>{cliente.motos.length} moto(s) | {cliente.atendimentos.length} servico(s)</small>
                </div>
                <div className="row-actions">
                  <button type="button" className="ghost-button" onClick={() => openClienteDetails(cliente)}>
                    Ver detalhes
                  </button>
                </div>
              </article>
            ))}
            {resultados.length === 0 ? (
              <div className="empty-state">
                {searchActive ? "Nenhum cliente encontrado com estes filtros." : "A tela abre vazia. Use nome, CPF, placa ou data para pesquisar."}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(selectedCliente)}
        onClose={() => !busy && setSelectedCliente(null)}
        title={selectedCliente?.nome || "Detalhes do cliente"}
        subtitle="Cadastro, motos e historico de servicos."
        size="large"
        actions={
          <>
            <button type="button" className="ghost-button" onClick={handlePrintHistorico}>
              <AppIcon name="printer" size={16} />
              Imprimir
            </button>
            <button type="button" className="primary-button" onClick={handleSaveCliente} disabled={busy}>
              Salvar cadastro
            </button>
          </>
        }
      >
        <div className="modal-stack">
          <div className="field-grid two-up">
            <label className="field-label">
              Nome
              <input value={clienteForm.nome} onChange={(event) => setClienteForm((current) => ({ ...current, nome: event.target.value }))} />
            </label>
            <label className="field-label">
              Telefone
              <input value={clienteForm.telefone} onChange={(event) => setClienteForm((current) => ({ ...current, telefone: formatPhone(event.target.value) }))} />
            </label>
          </div>

          <div className="field-grid two-up">
            <label className="field-label">
              CPF
              <input value={clienteForm.cpf} onChange={(event) => setClienteForm((current) => ({ ...current, cpf: formatCpf(event.target.value) }))} />
            </label>
            <label className="field-label">
              Observacoes
              <textarea value={clienteForm.observacoes} onChange={(event) => setClienteForm((current) => ({ ...current, observacoes: event.target.value }))} />
            </label>
          </div>

          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Motos</p>
              <h2 className="modal-section-title">Motos associadas</h2>
            </div>
            <button type="button" className="ghost-button" onClick={() => openMotoModal()}>
              <AppIcon name="plus" size={16} />
              Adicionar moto
            </button>
          </div>

          <div className="table-list">
            {motos.map((moto) => (
              <article className="row-card" key={moto.id}>
                <div>
                  <strong>
                    {moto.marca ? `${moto.marca} ` : ""}
                    {moto.modelo}
                  </strong>
                  <p>{moto.placa || "Sem placa"}</p>
                  <small>{moto.cor || "Sem cor"}{moto.km ? ` • ${moto.km} km` : ""}</small>
                </div>
                <div className="row-actions">
                  <button type="button" className="ghost-button" onClick={() => openMotoModal(moto)}>
                    Editar
                  </button>
                  <button type="button" className="ghost-button danger subtle-button" onClick={() => handleDeleteMoto(moto.id)} disabled={busy}>
                    Apagar
                  </button>
                </div>
              </article>
            ))}
            {motos.length === 0 ? <div className="empty-state">Nenhuma moto cadastrada para este cliente.</div> : null}
          </div>

          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Historico</p>
              <h2 className="modal-section-title">Servicos realizados</h2>
            </div>
          </div>

          <div className="table-list">
            {historico.map((item) => (
              <article className="detail-row" key={item.id}>
                <strong>
                  {item.motocicleta_modelo}
                  {item.motocicleta_placa ? ` • ${item.motocicleta_placa}` : ""}
                </strong>
                <p>Solicitado: {item.problema_servico}</p>
                <p>Feito: {item.servico_executado || "Nao informado"}</p>
                <p>Por: {item.mecanico_nome || "Nao informado"}</p>
                <div className="button-row">
                  <StatusBadge tone={item.situacao_pagamento === "PAGO" ? "success" : "warning"}>
                    {item.situacao_pagamento === "PAGO" ? "Pago" : "Pendente"}
                  </StatusBadge>
                  <StatusBadge tone="info">{item.status}</StatusBadge>
                </div>
              </article>
            ))}
            {historico.length === 0 ? <div className="empty-state">Nenhum servico encontrado para este cliente.</div> : null}
          </div>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => !busy && setCreateOpen(false)}
        title="Novo cliente"
        subtitle="Cadastro simples para futura vinculacao de motos."
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setCreateOpen(false)} disabled={busy}>
              Cancelar
            </button>
            <button type="button" className="primary-button" onClick={() => document.getElementById("clientes-create-form")?.requestSubmit()} disabled={busy}>
              Salvar cliente
            </button>
          </>
        }
      >
        <form id="clientes-create-form" className="modal-stack" onSubmit={handleCreateCliente}>
          <label className="field-label">
            Nome
            <input value={clienteForm.nome} onChange={(event) => setClienteForm((current) => ({ ...current, nome: event.target.value }))} />
          </label>
          <label className="field-label">
            Telefone
            <input value={clienteForm.telefone} onChange={(event) => setClienteForm((current) => ({ ...current, telefone: formatPhone(event.target.value) }))} />
          </label>
          <label className="field-label">
            CPF
            <input value={clienteForm.cpf} onChange={(event) => setClienteForm((current) => ({ ...current, cpf: formatCpf(event.target.value) }))} />
          </label>
          <label className="field-label">
            Observacoes
            <textarea value={clienteForm.observacoes} onChange={(event) => setClienteForm((current) => ({ ...current, observacoes: event.target.value }))} />
          </label>
        </form>
      </Modal>

      <Modal
        open={motoModalOpen}
        onClose={() => !busy && setMotoModalOpen(false)}
        title={motoTarget ? "Editar moto" : "Adicionar moto"}
        subtitle={selectedCliente ? `Cliente: ${selectedCliente.nome}` : ""}
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setMotoModalOpen(false)} disabled={busy}>
              Cancelar
            </button>
            <button type="button" className="primary-button" onClick={handleSaveMoto} disabled={busy}>
              Salvar moto
            </button>
          </>
        }
      >
        <div className="modal-stack">
          <div className="field-grid three-up">
            <label className="field-label">
              Marca
              <input
                list="clientes-brand-options"
                value={motoForm.marca}
                onChange={(event) => setMotoForm((current) => ({ ...current, marca: event.target.value }))}
              />
            </label>
            <label className="field-label">
              Modelo
              <input
                list="clientes-model-options"
                value={motoForm.modelo}
                onChange={(event) => setMotoForm((current) => ({ ...current, modelo: event.target.value }))}
              />
            </label>
            <label className="field-label">
              Cor
              <input value={motoForm.cor} onChange={(event) => setMotoForm((current) => ({ ...current, cor: event.target.value }))} />
            </label>
          </div>

          <div className="field-grid two-up">
            <label className="field-label">
              Placa
              <input value={motoForm.placa} onChange={(event) => setMotoForm((current) => ({ ...current, placa: formatPlate(event.target.value) }))} />
            </label>
            <label className="field-label">
              KM
              <input value={motoForm.km} onChange={(event) => setMotoForm((current) => ({ ...current, km: event.target.value.replace(/\D/g, "") }))} />
            </label>
          </div>

          <label className="field-label">
            Observacoes
            <textarea value={motoForm.observacoes} onChange={(event) => setMotoForm((current) => ({ ...current, observacoes: event.target.value }))} />
          </label>
        </div>
      </Modal>
    </section>
  );
}

export default ClientesPage;
