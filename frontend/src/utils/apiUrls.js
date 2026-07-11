function isLocalUrl(value = "") {
  return /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/|$)/i.test(String(value || ""));
}

function resolveApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL;

  if (import.meta.env.PROD && isLocalUrl(configuredUrl)) {
    return "/api";
  }

  return configuredUrl || "/api";
}

function resolveApiOrigin() {
  const apiUrl = resolveApiBaseUrl();

  if (apiUrl === "/api" || apiUrl.startsWith("/")) {
    return "";
  }

  return apiUrl.replace(/\/api\/?$/, "");
}

function resolveSocketUrl() {
  const configuredUrl = import.meta.env.VITE_SOCKET_URL;

  if (import.meta.env.PROD && isLocalUrl(configuredUrl)) {
    return undefined;
  }

  return configuredUrl || undefined;
}

export { resolveApiBaseUrl, resolveApiOrigin, resolveSocketUrl };
