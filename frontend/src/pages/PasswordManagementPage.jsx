import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { updateOwnPassword, updateSystemPassword } from "../services/authService";
import AppIcon from "../components/common/AppIcon";

const sectorLabels = {
  RECEPCAO: "Recepcao",
  OFICINA: "Oficina",
};

function PasswordManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.perfil === "ADMIN";
  const [ownForm, setOwnForm] = useState({
    senhaAtual: "",
    novaSenha: "",
    confirmarSenha: "",
  });
  const [sectorForm, setSectorForm] = useState({
    RECEPCAO: { novaSenha: "", confirmarSenha: "" },
    OFICINA: { novaSenha: "", confirmarSenha: "" },
  });
  const [savingKey, setSavingKey] = useState("");
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });

  function setFieldValue(field, value) {
    setOwnForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function setSectorFieldValue(perfil, field, value) {
    setSectorForm((current) => ({
      ...current,
      [perfil]: {
        ...current[perfil],
        [field]: value,
      },
    }));
  }

  async function handleOwnPasswordSubmit() {
    const senhaAtual = ownForm.senhaAtual.trim();
    const novaSenha = ownForm.novaSenha.trim();
    const confirmarSenha = ownForm.confirmarSenha.trim();

    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setFeedback({ type: "error", message: "Preencha senha atual, nova senha e confirmacao." });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setFeedback({ type: "error", message: "A confirmacao da nova senha nao confere." });
      return;
    }

    setSavingKey("own");
    setFeedback({ type: "", message: "" });

    try {
      await updateOwnPassword({
        senhaAtual,
        novaSenha,
      });
      setOwnForm({
        senhaAtual: "",
        novaSenha: "",
        confirmarSenha: "",
      });
      setFeedback({ type: "success", message: "Sua senha foi atualizada com sucesso." });
    } catch (requestError) {
      setFeedback({
        type: "error",
        message: requestError?.response?.data?.message || "Nao foi possivel atualizar sua senha.",
      });
    } finally {
      setSavingKey("");
    }
  }

  async function handleSectorPasswordSubmit(perfil) {
    const novaSenha = sectorForm[perfil].novaSenha.trim();
    const confirmarSenha = sectorForm[perfil].confirmarSenha.trim();

    if (!novaSenha || !confirmarSenha) {
      setFeedback({ type: "error", message: `Preencha a nova senha e a confirmacao de ${sectorLabels[perfil]}.` });
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setFeedback({ type: "error", message: `A confirmacao de senha de ${sectorLabels[perfil]} nao confere.` });
      return;
    }

    setSavingKey(perfil);
    setFeedback({ type: "", message: "" });

    try {
      await updateSystemPassword(perfil, novaSenha);
      setSectorForm((current) => ({
        ...current,
        [perfil]: { novaSenha: "", confirmarSenha: "" },
      }));
      setFeedback({ type: "success", message: `Senha de ${sectorLabels[perfil]} atualizada com sucesso.` });
    } catch (requestError) {
      setFeedback({
        type: "error",
        message: requestError?.response?.data?.message || "Nao foi possivel atualizar a senha.",
      });
    } finally {
      setSavingKey("");
    }
  }

  return (
    <section className="page-section">
      <div className="workspace-card">
        <div className="workspace-heading">
          <div className="title-with-icon">
            <span className="title-icon">
              <AppIcon name="settings" />
            </span>
            <div>
              <p className="eyebrow">Seguranca</p>
              <h2>Gerenciamento de senhas</h2>
              <p className="subtitle">Troque sua senha e, no acesso administrativo, atualize as senhas dos setores.</p>
            </div>
          </div>
        </div>

        <div className="password-grid">
          <article className="detail-row password-card">
            <div className="password-card-header">
              <strong>Minha senha</strong>
              <span className="helper-copy">{user?.perfil === "ADMIN" ? "Administrador" : user?.perfil}</span>
            </div>

            <div className="field-grid">
              <label className="field-label">
                Senha atual
                <input
                  type="password"
                  value={ownForm.senhaAtual}
                  onChange={(event) => setFieldValue("senhaAtual", event.target.value)}
                />
              </label>

              <label className="field-label">
                Nova senha
                <input
                  type="password"
                  value={ownForm.novaSenha}
                  onChange={(event) => setFieldValue("novaSenha", event.target.value)}
                />
              </label>

              <label className="field-label">
                Confirmar nova senha
                <input
                  type="password"
                  value={ownForm.confirmarSenha}
                  onChange={(event) => setFieldValue("confirmarSenha", event.target.value)}
                />
              </label>
            </div>

            <button type="button" className="primary-button" onClick={() => void handleOwnPasswordSubmit()} disabled={savingKey === "own"}>
              {savingKey === "own" ? "Salvando..." : "Atualizar minha senha"}
            </button>
          </article>

          {isAdmin ? (
            <article className="detail-row password-card">
              <div className="password-card-header">
                <strong>Senhas dos setores</strong>
                <span className="helper-copy">Recepcao e oficina</span>
              </div>

              <div className="password-sector-stack">
                {Object.entries(sectorLabels).map(([perfil, label]) => (
                  <div key={perfil} className="password-sector-block">
                    <div className="password-sector-head">
                      <strong>{label}</strong>
                    </div>

                    <div className="field-grid two-column">
                      <label className="field-label">
                        Nova senha
                        <input
                          type="password"
                          value={sectorForm[perfil].novaSenha}
                          onChange={(event) => setSectorFieldValue(perfil, "novaSenha", event.target.value)}
                        />
                      </label>

                      <label className="field-label">
                        Confirmar senha
                        <input
                          type="password"
                          value={sectorForm[perfil].confirmarSenha}
                          onChange={(event) => setSectorFieldValue(perfil, "confirmarSenha", event.target.value)}
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => void handleSectorPasswordSubmit(perfil)}
                      disabled={savingKey === perfil}
                    >
                      {savingKey === perfil ? "Salvando..." : `Salvar senha de ${label}`}
                    </button>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </div>

        {feedback.message ? (
          <p className={`field-note ${feedback.type === "error" ? "error-text" : "success-text"}`}>{feedback.message}</p>
        ) : null}
      </div>
    </section>
  );
}

export default PasswordManagementPage;
