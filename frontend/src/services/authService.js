import api from "../api/axios";

async function login(payload) {
  const response = await api.post("/auth/login", payload);
  return response.data.data;
}

async function me() {
  const response = await api.get("/auth/me");
  return response.data.data;
}

async function logout() {
  const response = await api.post("/auth/logout");
  return response.data.data;
}

async function updateOwnPassword(payload) {
  const response = await api.patch("/auth/password", payload);
  return response.data.data;
}

async function updateSystemPassword(perfil, senha) {
  const response = await api.patch(`/auth/passwords/${perfil}`, { senha });
  return response.data.data;
}

export { login, me, logout, updateOwnPassword, updateSystemPassword };
