import axios from "axios";
import { getStoredToken } from "../utils/storage";
import { resolveApiBaseUrl } from "../utils/apiUrls";

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
