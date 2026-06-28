const tokenKey = "jebil.accessToken";

function getStoredToken() {
  return localStorage.getItem(tokenKey);
}

function setStoredToken(token) {
  localStorage.setItem(tokenKey, token);
}

function clearStoredToken() {
  localStorage.removeItem(tokenKey);
}

export { getStoredToken, setStoredToken, clearStoredToken };
