import api from "../api/axios";

async function getPainelOficina() {
  const response = await api.get("/paineis/oficina");
  return response.data.data;
}

async function getPainelClientes() {
  const response = await api.get("/paineis/clientes");
  return response.data.data;
}

async function getPainelClientesContexto() {
  const response = await api.get("/paineis/clientes/contexto");
  return response.data.data;
}

export { getPainelOficina, getPainelClientes, getPainelClientesContexto };
