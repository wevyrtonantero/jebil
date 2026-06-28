import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getDefaultRouteByRole } from "../utils/roleRoutes";
import AppIcon from "../components/common/AppIcon";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await login(form);
      navigate(getDefaultRouteByRole(user?.perfil), { replace: true });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Nao foi possivel fazer login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-reference-shell">
      <section className="auth-reference-scene" aria-hidden="true">
        <div className="auth-reference-scene-mask" />
      </section>

      <section className="auth-reference-panel">
        <form className="auth-reference-card" onSubmit={handleSubmit}>
          <img src="/branding/jebil.png" alt="Jebil Motos Preparacoes" className="auth-reference-logo" />

          <h1 className="auth-reference-title">
            JEBIL <span>MOTOS</span>
          </h1>

          <span className="auth-reference-accent" />
          <p className="auth-reference-subtitle">Acesse o sistema</p>

          <label className="auth-reference-field">
            <span className="auth-reference-field-icon">
              <AppIcon name="user" size={22} />
            </span>
            <input
              type="text"
              placeholder="Usuario"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </label>

          <label className="auth-reference-field">
            <span className="auth-reference-field-icon">
              <AppIcon name="lock" size={22} />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              value={form.senha}
              onChange={(event) => setForm((current) => ({ ...current, senha: event.target.value }))}
            />
            <button
              type="button"
              className="auth-reference-eye"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((current) => !current)}
            >
              <AppIcon name={showPassword ? "eyeOff" : "eye"} size={20} />
            </button>
          </label>

          {error ? <p className="form-error auth-reference-error">{error}</p> : null}

          <button type="submit" className="auth-reference-submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="auth-reference-help">Use o login e a senha do seu setor.</p>

          <div className="auth-reference-footer">
            <p>
              © 2026 <strong>JEBIL MOTOS</strong>. Todos os direitos reservados.
            </p>
            <a href="https://site-inovascript.vercel.app/" target="_blank" rel="noreferrer" className="auth-reference-credit">
              <span>Desenvolvido por</span>
              <img src="/branding/inovascript-logo.png" alt="InovaScript" className="auth-reference-credit-logo" />
            </a>
          </div>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
