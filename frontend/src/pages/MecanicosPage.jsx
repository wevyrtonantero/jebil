import { useEffect, useMemo, useState } from "react";
import {
  createMecanico,
  deleteMecanicoFoto,
  listMecanicos,
  updateMecanico,
  updateMecanicoDisponibilidade,
  updateMecanicoStatus,
  uploadMecanicoFoto,
} from "../services/mecanicoService";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import Modal from "../components/common/Modal";
import AppIcon from "../components/common/AppIcon";

const initialForm = {
  nome: "",
  disponivel_hoje: true,
};

function MecanicosPage() {
  const [mecanicos, setMecanicos] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMecanico, setSelectedMecanico] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [editForm, setEditForm] = useState(initialForm);
  const [uploadKeys, setUploadKeys] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadMecanicos() {
    const data = await listMecanicos();
    setMecanicos(data);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMecanicos().catch((requestError) => setError(requestError?.response?.data?.message || "Erro ao carregar mecanicos."));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useRealtimeRefresh(loadMecanicos);

  const mecanicosVisiveis = useMemo(
    () =>
      mecanicos
        .filter((item) => (showInactive ? true : item.ativo))
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    [mecanicos, showInactive],
  );

  async function handleCreate(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await createMecanico({
        nome: form.nome,
        ordem_exibicao: 0,
        disponivel_hoje: form.disponivel_hoje,
      });
      setForm(initialForm);
      setCreateOpen(false);
      await loadMecanicos();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao salvar mecanico.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    if (!selectedMecanico) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await updateMecanico(selectedMecanico.id, {
        nome: editForm.nome,
        ordem_exibicao: 0,
        disponivel_hoje: editForm.disponivel_hoje,
      });
      await loadMecanicos();
      setSelectedMecanico((current) =>
        current
          ? {
              ...current,
              nome: editForm.nome,
              disponivel_hoje: editForm.disponivel_hoje,
            }
          : null,
      );
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao atualizar mecanico.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(id, file) {
    if (!file) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await uploadMecanicoFoto(id, file);
      setUploadKeys((current) => ({ ...current, [id]: Date.now() }));
      await loadMecanicos();
      const atualizado = (await listMecanicos()).find((item) => item.id === id);
      setSelectedMecanico(atualizado || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao enviar foto.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeletePhoto(id) {
    setBusy(true);
    setError("");

    try {
      await deleteMecanicoFoto(id);
      setUploadKeys((current) => ({ ...current, [id]: Date.now() }));
      await loadMecanicos();
      const atualizado = (await listMecanicos()).find((item) => item.id === id);
      setSelectedMecanico(atualizado || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao remover foto.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusToggle(ativo) {
    if (!selectedMecanico) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await updateMecanicoStatus(selectedMecanico.id, ativo);
      await loadMecanicos();
      const atualizado = (await listMecanicos()).find((item) => item.id === selectedMecanico.id);
      setSelectedMecanico(atualizado || null);
      if (!ativo && !showInactive) {
        setSelectedMecanico(null);
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao atualizar status do mecanico.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisponibilidadeToggle() {
    if (!selectedMecanico) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await updateMecanicoDisponibilidade(selectedMecanico.id, !editForm.disponivel_hoje);
      const proximo = !editForm.disponivel_hoje;
      setEditForm((current) => ({ ...current, disponivel_hoje: proximo }));
      await loadMecanicos();
      const atualizado = (await listMecanicos()).find((item) => item.id === selectedMecanico.id);
      setSelectedMecanico(atualizado || null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao alterar a escala do mecanico.");
    } finally {
      setBusy(false);
    }
  }

  function openEditModal(mecanico) {
    setSelectedMecanico(mecanico);
    setEditForm({
      nome: mecanico.nome,
      disponivel_hoje: mecanico.disponivel_hoje,
    });
    setError("");
  }

  return (
    <section className="page-section">
      <div className="workspace-card">
        <div className="workspace-heading">
          <div className="title-with-icon">
            <span className="title-icon">
              <AppIcon name="mechanic" />
            </span>
            <div>
              <p className="eyebrow">Equipe</p>
              <h2>Mecanicos</h2>
              <p className="subtitle">Lista limpa com foto e nome. Todo o restante fica dentro do modal de edicao.</p>
            </div>
          </div>
          <div className="button-row">
            <label className="inline-check">
              <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
              <span>Mostrar inativados</span>
            </label>
            <button type="button" className="primary-button" onClick={() => setCreateOpen(true)}>
              <AppIcon name="plus" size={18} />
              Novo mecanico
            </button>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="mechanic-tiles">
          {mecanicosVisiveis.map((mecanico) => (
            <button
              type="button"
              key={mecanico.id}
              className={`mechanic-tile ${mecanico.ativo ? "" : "is-inactive"}`}
              onClick={() => openEditModal(mecanico)}
            >
              <img className="mechanic-photo" src={mecanico.foto_url} alt={mecanico.nome} />
              <strong>{mecanico.nome}</strong>
            </button>
          ))}
          {mecanicosVisiveis.length === 0 ? <div className="empty-state">Nenhum mecanico encontrado com este filtro.</div> : null}
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => !busy && setCreateOpen(false)}
        title="Novo mecanico"
        subtitle="Cadastro enxuto, sem ordem manual."
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setCreateOpen(false)} disabled={busy}>
              Cancelar
            </button>
            <button type="button" className="primary-button" onClick={() => document.getElementById("mecanico-create-form")?.requestSubmit()} disabled={busy}>
              Salvar mecanico
            </button>
          </>
        }
      >
        <form id="mecanico-create-form" className="modal-stack" onSubmit={handleCreate}>
          <label className="field-label">
            Nome
            <input value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} />
          </label>
          <div className="field-label">
            Escala de hoje
            <div className="button-row">
              <button
                type="button"
                className={`toggle-chip compact-toggle ${form.disponivel_hoje ? "active" : ""}`}
                onClick={() => setForm((current) => ({ ...current, disponivel_hoje: !current.disponivel_hoje }))}
              >
                {form.disponivel_hoje ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedMecanico)}
        onClose={() => !busy && setSelectedMecanico(null)}
        title={selectedMecanico?.nome || "Editar mecanico"}
        subtitle="Nome, foto, escala e status do cadastro."
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setSelectedMecanico(null)} disabled={busy}>
              Fechar
            </button>
            <button type="button" className="primary-button" onClick={handleSaveEdit} disabled={busy}>
              Salvar alteracoes
            </button>
          </>
        }
      >
        {selectedMecanico ? (
          <div className="modal-stack">
            <div className="mechanic-editor">
              <label className="mechanic-photo-editor">
                <img className="mechanic-photo large" src={selectedMecanico.foto_url} alt={selectedMecanico.nome} />
                <span className="photo-edit-badge">
                  <AppIcon name="pencil" size={16} />
                </span>
                <input
                  key={uploadKeys[selectedMecanico.id] || selectedMecanico.id}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(event) => handleUpload(selectedMecanico.id, event.target.files?.[0])}
                />
              </label>

              <div className="mechanic-editor-actions">
                <button type="button" className="ghost-button subtle-button" onClick={() => handleDeletePhoto(selectedMecanico.id)} disabled={busy}>
                  Remover foto
                </button>
              </div>
            </div>

            <label className="field-label">
              Nome
              <input value={editForm.nome} onChange={(event) => setEditForm((current) => ({ ...current, nome: event.target.value }))} />
            </label>

            <div className="field-grid two-up">
              <article className="detail-row">
                <strong>Escala hoje</strong>
                <div className="button-row">
                  <button
                    type="button"
                    className={`toggle-chip compact-toggle ${editForm.disponivel_hoje ? "active" : ""}`}
                    onClick={handleDisponibilidadeToggle}
                    disabled={busy || !selectedMecanico.ativo}
                  >
                    {editForm.disponivel_hoje ? "ON" : "OFF"}
                  </button>
                </div>
              </article>

              <article className="detail-row">
                <strong>Cadastro</strong>
                <div className="button-row">
                  {selectedMecanico.ativo ? (
                    <button type="button" className="ghost-button danger subtle-button" onClick={() => handleStatusToggle(false)} disabled={busy}>
                      Inativar
                    </button>
                  ) : (
                    <button type="button" className="ghost-button subtle-button" onClick={() => handleStatusToggle(true)} disabled={busy}>
                      Reativar
                    </button>
                  )}
                </div>
              </article>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

export default MecanicosPage;
