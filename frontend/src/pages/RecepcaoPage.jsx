import { useEffect, useMemo, useState } from "react";
import { createCliente, listClientes, reactivateCliente, updateCliente } from "../services/clienteService";
import {
  createMotocicleta,
  listMotocicletas,
  listMotocicletasByCliente,
  reactivateMotocicleta,
  updateMotocicleta,
} from "../services/motocicletaService";
import { createAtendimento, listAtendimentos, updateAtendimentoRecepcao, updatePagamento } from "../services/atendimentoService";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import Modal from "../components/common/Modal";
import AppIcon from "../components/common/AppIcon";
import StatusBadge from "../components/common/StatusBadge";
import { formatCpf, formatPhone, formatPlate, formatTime } from "../utils/formatters";
import { brandOptions, getModelOptions } from "../data/motoCatalog";

const initialForm = {
  nome: "",
  telefone: "",
  cpf: "",
  modelo: "",
  marca: "",
  cor: "",
  placa: "",
  km: "",
  problema_servico: "",
  observacoes: "",
  observacoes_internas: "",
  situacao_pagamento: "PAGO",
};

function getReceptionStatusLabel(status) {
  const labels = {
    AGUARDANDO: "Na fila",
    EM_SERVICO: "Em servico",
    AGUARDANDO_PECAS: "Aguardando peca",
    SAIDA_PARA_TESTE: "Saida para teste",
    SERVICO_CONCLUIDO: "Servico concluido",
    PODE_RETIRAR: "Pode retirar",
  };

  return labels[status] || status;
}

function RecepcaoPage() {
  const [form, setForm] = useState(initialForm);
  const [recentes, setRecentes] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [motoChoiceOpen, setMotoChoiceOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [sending, setSending] = useState(false);
  const [cpfLoading, setCpfLoading] = useState(false);
  const [selectedClienteId, setSelectedClienteId] = useState(null);
  const [selectedMotoId, setSelectedMotoId] = useState(null);
  const [motosAssociadas, setMotosAssociadas] = useState([]);
  const [recentFilters, setRecentFilters] = useState({ nome: "", placa: "" });
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({
    problema_servico: "",
    observacoes: "",
    observacoes_internas: "",
    situacao_pagamento: "PENDENTE",
  });
  const [error, setError] = useState("");

  async function loadRecentes() {
    const data = await listAtendimentos();
    setRecentes(data.filter((item) => !["FINALIZADO", "CANCELADO"].includes(item.status)));
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRecentes().catch(() => {});
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useRealtimeRefresh(loadRecentes);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyMotoToForm(moto) {
    setSelectedMotoId(moto.id);
    setForm((current) => ({
      ...current,
      modelo: moto.modelo || "",
      marca: moto.marca || "",
      cor: moto.cor || "",
      placa: moto.placa || "",
      km: moto.km || "",
      observacoes: moto.observacoes || current.observacoes,
    }));
    setMotoChoiceOpen(false);
  }

  function clearMotoSelection() {
    setSelectedMotoId(null);
    setForm((current) => ({
      ...current,
      modelo: "",
      marca: "",
      cor: "",
      placa: "",
      km: "",
    }));
    setMotoChoiceOpen(false);
  }

  async function handleCpfLookup(rawCpf) {
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
        setMotosAssociadas([]);
        return;
      }

      setSelectedClienteId(cliente.id);
      setForm((current) => ({
        ...current,
        nome: cliente.nome || current.nome,
        telefone: cliente.telefone || current.telefone,
        cpf: cliente.cpf || current.cpf,
        observacoes: cliente.observacoes || current.observacoes,
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
  }

  useEffect(() => {
    const cpfDigits = form.cpf.replace(/\D/g, "");

    if (cpfDigits.length !== 11) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleCpfLookup(form.cpf);
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [form.cpf]);

  function validateBeforeReview() {
    if (!form.nome || !form.telefone || !form.cpf || !form.modelo || !form.placa || !form.problema_servico) {
      setError("Preencha nome, telefone, CPF, modelo, placa e defeito antes de enviar.");
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
        observacoes: form.observacoes,
      });
    }

    try {
      return await createCliente({
        nome: form.nome,
        telefone: form.telefone,
        cpf: form.cpf,
        observacoes: form.observacoes,
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
          observacoes: form.observacoes,
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
        observacoes: form.observacoes,
      });
    }
  }

  async function resolveMotocicleta(clienteId) {
    if (selectedMotoId) {
      return updateMotocicleta(selectedMotoId, {
        cliente_id: clienteId,
        modelo: form.modelo,
        marca: form.marca || null,
        cor: form.cor || null,
        placa: form.placa,
        km: form.km || null,
        observacoes: form.observacoes,
      });
    }

    try {
      return await createMotocicleta({
        cliente_id: clienteId,
        modelo: form.modelo,
        marca: form.marca || null,
        cor: form.cor || null,
        placa: form.placa,
        km: form.km || null,
        observacoes: form.observacoes,
      });
    } catch (requestError) {
      if (requestError?.response?.status !== 409 || !form.placa) {
        throw requestError;
      }

      const ativas = await listMotocicletas({ placa: form.placa, limit: 1, ativo: true });
      const motoAtiva = ativas.data?.[0];

      if (motoAtiva) {
        setSelectedMotoId(motoAtiva.id);
        return updateMotocicleta(motoAtiva.id, {
          cliente_id: clienteId,
          modelo: form.modelo,
          marca: form.marca || null,
          cor: form.cor || null,
          placa: form.placa,
          km: form.km || null,
          observacoes: form.observacoes,
        });
      }

      const inativas = await listMotocicletas({ placa: form.placa, limit: 1, ativo: false });
      const motoInativa = inativas.data?.[0];

      if (!motoInativa) {
        throw requestError;
      }

      await reactivateMotocicleta(motoInativa.id);
      setSelectedMotoId(motoInativa.id);
      return updateMotocicleta(motoInativa.id, {
        cliente_id: clienteId,
        modelo: form.modelo,
        marca: form.marca || null,
        cor: form.cor || null,
        placa: form.placa,
        km: form.km || null,
        observacoes: form.observacoes,
      });
    }
  }

  async function handleConfirmSubmit() {
    setSending(true);
    setError("");

    try {
      const cliente = await resolveCliente();
      const motocicleta = await resolveMotocicleta(cliente.id);

      await createAtendimento({
        cliente_id: cliente.id,
        motocicleta_id: motocicleta.id,
        problema_servico: form.problema_servico,
        observacoes: form.observacoes,
        observacoes_internas: form.observacoes_internas,
        situacao_pagamento: form.situacao_pagamento,
      });

      setSuccessData({
        cliente_nome: cliente.nome,
        motocicleta_modelo: motocicleta.modelo,
        motocicleta_placa: motocicleta.placa,
      });
      setForm(initialForm);
      setSelectedClienteId(null);
      setSelectedMotoId(null);
      setMotosAssociadas([]);
      setReviewOpen(false);
      await loadRecentes();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel enviar para a oficina.");
    } finally {
      setSending(false);
    }
  }

  async function handleEditSave() {
    if (!editTarget) {
      return;
    }

    setSending(true);
    setError("");

    try {
      await updateAtendimentoRecepcao(editTarget.id, editForm);
      setEditOpen(false);
      setEditTarget(null);
      await loadRecentes();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel atualizar o atendimento.");
    } finally {
      setSending(false);
    }
  }

  const modelosDisponiveis = useMemo(() => getModelOptions(form.marca, form.modelo), [form.marca, form.modelo]);

  const recepcaoVisivel = recentes.filter(
    (item) => item.status === "AGUARDANDO" || (item.status === "SERVICO_CONCLUIDO" && item.situacao_pagamento === "PENDENTE"),
  );
  const recentesVisiveis = recepcaoVisivel.slice(0, 6);
  const recentesFiltrados = recepcaoVisivel.filter((item) => {
    const nomeOk = !recentFilters.nome || item.cliente_nome.toLowerCase().includes(recentFilters.nome.toLowerCase());
    const placaOk = !recentFilters.placa || item.motocicleta_placa?.toLowerCase().includes(recentFilters.placa.toLowerCase());
    return nomeOk && placaOk;
  });

  return (
    <section className="page-section">
      <datalist id="brand-options">
        {brandOptions.map((brand) => (
          <option key={brand} value={brand} />
        ))}
      </datalist>
      <datalist id="model-options">
        {modelosDisponiveis.map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>

      <div className="workspace-grid">
        <div className="workspace-card">
          <div className="workspace-heading">
            <div className="title-with-icon">
              <span className="title-icon">
                <AppIcon name="reception" />
              </span>
              <div>
                <p className="eyebrow">Recepcao</p>
                <h2>Entrada rapida</h2>
                <p className="subtitle">Digite o CPF para puxar cliente e motos. Se houver mais de uma moto, a tela pergunta qual usar.</p>
              </div>
            </div>
          </div>

          <div className="field-grid two-up">
            <label className="field-label">
              CPF *
              <input
                value={form.cpf}
                placeholder="000.000.000-00"
                onChange={(event) => updateField("cpf", formatCpf(event.target.value))}
              />
              {cpfLoading ? <span className="field-note">Buscando cliente...</span> : null}
            </label>
            <label className="field-label">
              Telefone *
              <input
                value={form.telefone}
                placeholder="(11) 99999-9999"
                onChange={(event) => updateField("telefone", formatPhone(event.target.value))}
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field-label">
              Cliente *
              <input value={form.nome} placeholder="Nome completo do cliente" onChange={(event) => updateField("nome", event.target.value)} />
            </label>
          </div>

          <div className="field-grid three-up">
            <label className="field-label">
              Marca
              <input list="brand-options" value={form.marca} placeholder="Honda" onChange={(event) => updateField("marca", event.target.value)} />
            </label>
            <label className="field-label">
              Modelo *
              <input
                list="model-options"
                value={form.modelo}
                placeholder="CG 160"
                onChange={(event) => updateField("modelo", event.target.value)}
              />
            </label>
            <label className="field-label">
              Cor
              <input value={form.cor} placeholder="Preta" onChange={(event) => updateField("cor", event.target.value)} />
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

          <label className="field-label">
            Itens / servicos solicitados *
            <textarea
              value={form.problema_servico}
              placeholder="Descreva o que precisa ser feito"
              onChange={(event) => updateField("problema_servico", event.target.value)}
            />
          </label>

          <div className="field-grid two-up">
            <label className="field-label">
              Observacoes
              <textarea value={form.observacoes} placeholder="Anotacoes gerais" onChange={(event) => updateField("observacoes", event.target.value)} />
            </label>
            <label className="field-label">
              Observacoes internas
              <textarea
                value={form.observacoes_internas}
                placeholder="Recados para a oficina"
                onChange={(event) => updateField("observacoes_internas", event.target.value)}
              />
            </label>
          </div>

          <div className="field-label">
            Pagamento
            <div className="segmented">
              <button
                type="button"
                className={`toggle-chip ${form.situacao_pagamento === "PAGO" ? "active" : ""}`}
                onClick={() => updateField("situacao_pagamento", "PAGO")}
              >
                Pago
              </button>
              <button
                type="button"
                className={`toggle-chip ${form.situacao_pagamento === "PENDENTE" ? "active" : ""}`}
                onClick={() => updateField("situacao_pagamento", "PENDENTE")}
              >
                Nao pago
              </button>
            </div>
          </div>

          {error ? <p className="form-error">{error}</p> : null}

          <div className="button-row">
            <button
              type="button"
              className="primary-button full-width"
              onClick={() => {
                if (validateBeforeReview()) {
                  setReviewOpen(true);
                }
              }}
            >
              <AppIcon name="send" size={18} />
              Salvar e enviar para oficina
            </button>
          </div>
        </div>

        <aside className="workspace-card">
          <div className="workspace-heading">
            <div>
              <p className="eyebrow">Fila da recepcao</p>
              <h2>Fila e pendencias</h2>
            </div>
            <button type="button" className="ghost-button" onClick={() => setListOpen(true)}>
              Ver todos
            </button>
          </div>

          <div className="recent-list compact-cards">
            {recentesVisiveis.map((item) => (
              <article className="recent-card simple" key={item.id}>
                <div>
                  <strong>{item.cliente_nome}</strong>
                  <p>{item.motocicleta_placa || item.motocicleta_modelo}</p>
                </div>
                <StatusBadge tone={item.situacao_pagamento === "PAGO" ? "success" : "warning"}>
                  {getReceptionStatusLabel(item.status)}
                </StatusBadge>
              </article>
            ))}
            {recentesVisiveis.length === 0 ? <div className="empty-state">Nenhum atendimento aguardando ou pendente de pagamento.</div> : null}
          </div>
        </aside>
      </div>

      <Modal
        open={motoChoiceOpen}
        onClose={() => setMotoChoiceOpen(false)}
        title="Escolher moto do cliente"
        subtitle="Encontramos mais de uma moto vinculada a este CPF."
      >
        <div className="selection-grid">
          {motosAssociadas.map((moto) => (
            <button key={moto.id} type="button" className="selection-card" onClick={() => applyMotoToForm(moto)}>
              <strong>{moto.modelo}</strong>
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
        open={reviewOpen}
        onClose={() => !sending && setReviewOpen(false)}
        title="Confirmar envio para oficina"
        subtitle="Revise o essencial antes de enviar."
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setReviewOpen(false)} disabled={sending}>
              Voltar
            </button>
            <button type="button" className="primary-button" onClick={handleConfirmSubmit} disabled={sending}>
              {sending ? "Enviando..." : "Confirmar e enviar"}
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
              {form.marca} {form.modelo}
            </p>
          </article>
          <article className="detail-row">
            <strong>Placa</strong>
            <p>{form.placa}</p>
          </article>
          <article className="detail-row">
            <strong>Pagamento</strong>
            <p>{form.situacao_pagamento === "PAGO" ? "Pago" : "Nao pago"}</p>
          </article>
        </div>
      </Modal>

      <Modal
        open={Boolean(successData)}
        onClose={() => setSuccessData(null)}
        title="Enviado para oficina"
        subtitle="Cadastro concluido com sucesso."
        size="small"
        actions={
          <button type="button" className="primary-button" onClick={() => setSuccessData(null)}>
            Fechar
          </button>
        }
      >
        {successData ? (
          <div className="modal-stack">
            <article className="detail-row">
              <strong>Cliente</strong>
              <p>{successData.cliente_nome}</p>
            </article>
            <article className="detail-row">
              <strong>Moto</strong>
              <p>
                {successData.motocicleta_modelo} • {successData.motocicleta_placa}
              </p>
            </article>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={listOpen}
        onClose={() => setListOpen(false)}
        title="Fila da recepcao"
        subtitle="Filtre por nome ou placa e altere a fila e os servicos concluidos que ainda faltam pagamento."
        size="large"
      >
        <div className="field-grid two-up">
          <label className="field-label">
            Nome do cliente
            <input value={recentFilters.nome} onChange={(event) => setRecentFilters((current) => ({ ...current, nome: event.target.value }))} />
          </label>
          <label className="field-label">
            Placa
            <input
              value={recentFilters.placa}
              onChange={(event) => setRecentFilters((current) => ({ ...current, placa: formatPlate(event.target.value) }))}
            />
          </label>
        </div>
        <div className="recent-list">
          {recentesFiltrados.map((item) => (
            <article className="recent-card" key={item.id}>
              <div>
                <strong>{item.cliente_nome}</strong>
                <p>
                  {item.motocicleta_modelo} {item.motocicleta_placa ? `• ${item.motocicleta_placa}` : ""}
                </p>
                <small>{item.problema_servico}</small>
              </div>
              <div className="stacked-right">
                <small>{formatTime(item.entrada_em)}</small>
                <StatusBadge tone={item.situacao_pagamento === "PAGO" ? "success" : "warning"}>
                  {item.situacao_pagamento === "PAGO" ? "Pago" : "Nao pago"}
                </StatusBadge>
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => updatePagamento(item.id, item.situacao_pagamento === "PAGO" ? "PENDENTE" : "PAGO").then(loadRecentes)}
                  >
                    Alternar pago
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => {
                      setEditTarget(item);
                      setEditForm({
                        problema_servico: item.problema_servico || "",
                        observacoes: item.observacoes || "",
                        observacoes_internas: item.observacoes_internas || "",
                        situacao_pagamento: item.situacao_pagamento || "PENDENTE",
                      });
                      setEditOpen(true);
                    }}
                  >
                    Editar
                  </button>
                </div>
              </div>
            </article>
          ))}
          {recentesFiltrados.length === 0 ? <div className="empty-state">Nenhum atendimento encontrado com estes filtros.</div> : null}
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => !sending && setEditOpen(false)}
        title="Editar atendimento"
        subtitle={editTarget ? `${editTarget.cliente_nome} • ${editTarget.motocicleta_modelo}` : ""}
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setEditOpen(false)} disabled={sending}>
              Cancelar
            </button>
            <button type="button" className="primary-button" onClick={handleEditSave} disabled={sending}>
              Salvar alteracoes
            </button>
          </>
        }
      >
        <div className="modal-stack">
          <label className="field-label">
            Itens / servicos
            <textarea
              value={editForm.problema_servico}
              onChange={(event) => setEditForm((current) => ({ ...current, problema_servico: event.target.value }))}
            />
          </label>
          <label className="field-label">
            Observacoes
            <textarea value={editForm.observacoes} onChange={(event) => setEditForm((current) => ({ ...current, observacoes: event.target.value }))} />
          </label>
          <label className="field-label">
            Observacoes internas
            <textarea
              value={editForm.observacoes_internas}
              onChange={(event) => setEditForm((current) => ({ ...current, observacoes_internas: event.target.value }))}
            />
          </label>
          <div className="field-label">
            Pagamento
            <div className="segmented">
              <button
                type="button"
                className={`toggle-chip ${editForm.situacao_pagamento === "PAGO" ? "active" : ""}`}
                onClick={() => setEditForm((current) => ({ ...current, situacao_pagamento: "PAGO" }))}
              >
                Pago
              </button>
              <button
                type="button"
                className={`toggle-chip ${editForm.situacao_pagamento === "PENDENTE" ? "active" : ""}`}
                onClick={() => setEditForm((current) => ({ ...current, situacao_pagamento: "PENDENTE" }))}
              >
                Nao pago
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default RecepcaoPage;
