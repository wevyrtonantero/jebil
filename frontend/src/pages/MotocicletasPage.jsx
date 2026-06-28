import { useEffect, useState } from "react";
import { listClientes } from "../services/clienteService";
import {
  createMotocicleta,
  listMotocicletas,
  reactivateMotocicleta,
  updateMotocicletaStatus,
} from "../services/motocicletaService";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";

function MotocicletasPage() {
  const [clientes, setClientes] = useState([]);
  const [motocicletas, setMotocicletas] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    cliente_id: "",
    marca: "",
    modelo: "",
    cor: "",
    placa: "",
    km: "",
    observacoes: "",
  });

  async function loadData() {
    const [clientesResponse, motocicletasResponse] = await Promise.all([listClientes({ limit: 100 }), listMotocicletas({ limit: 100 })]);
    setClientes(clientesResponse.data);
    setMotocicletas(motocicletasResponse.data);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData().catch((requestError) => setError(requestError?.response?.data?.message || "Erro ao carregar dados."));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useRealtimeRefresh(loadData);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    try {
      await createMotocicleta(form);
      setForm({
        cliente_id: "",
        marca: "",
        modelo: "",
        cor: "",
        placa: "",
        km: "",
        observacoes: "",
      });
      await loadData();
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Erro ao salvar motocicleta.");
    }
  }

  return (
    <section className="page-section two-column">
      <form className="panel-card" onSubmit={handleSubmit}>
        <div className="page-header compact">
          <div>
            <p className="eyebrow">Cadastro</p>
            <h1>Motocicletas</h1>
          </div>
        </div>
        <select value={form.cliente_id} onChange={(event) => setForm({ ...form, cliente_id: event.target.value })}>
          <option value="">Selecione o cliente</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
        <input placeholder="Marca" value={form.marca} onChange={(event) => setForm({ ...form, marca: event.target.value })} />
        <input placeholder="Modelo" value={form.modelo} onChange={(event) => setForm({ ...form, modelo: event.target.value })} />
        <input placeholder="Cor" value={form.cor} onChange={(event) => setForm({ ...form, cor: event.target.value })} />
        <input placeholder="Placa" value={form.placa} onChange={(event) => setForm({ ...form, placa: event.target.value })} />
        <input placeholder="KM" value={form.km} onChange={(event) => setForm({ ...form, km: event.target.value })} />
        <textarea
          placeholder="Observacoes"
          value={form.observacoes}
          onChange={(event) => setForm({ ...form, observacoes: event.target.value })}
        />
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" className="primary-button">
          Salvar motocicleta
        </button>
      </form>

      <div className="panel-card">
        <div className="page-header compact">
          <div>
            <p className="eyebrow">Lista</p>
            <h1>Motocicletas cadastradas</h1>
          </div>
        </div>
        <div className="table-list">
          {motocicletas.map((moto) => (
            <article className="row-card" key={moto.id}>
              <div>
                <strong>{moto.modelo}</strong>
                <p>{moto.cliente_nome} • {moto.placa || "Sem placa"}</p>
              </div>
              <div className="row-actions">
                <span className={`badge ${moto.ativo ? "badge-success" : "badge-warning"}`}>
                  {moto.ativo ? "Ativa" : "Inativa"}
                </span>
                <button type="button" className="ghost-button" onClick={() => updateMotocicletaStatus(moto.id, !moto.ativo).then(loadData)}>
                  {moto.ativo ? "Inativar" : "Ativar"}
                </button>
                {!moto.ativo ? (
                  <button type="button" className="ghost-button" onClick={() => reactivateMotocicleta(moto.id).then(loadData)}>
                    Reativar
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MotocicletasPage;
