import { createContext, useEffect, useState } from "react";
import { login as loginRequest, logout as logoutRequest, me } from "../services/authService";
import { clearStoredToken, getStoredToken, setStoredToken } from "../utils/storage";

const AuthContext = createContext(null);
const initialToken = getStoredToken();

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(initialToken));

  useEffect(() => {
    if (!initialToken) {
      return;
    }

    async function bootstrap() {
      try {
        const currentUser = await me();
        setUser(currentUser);
      } catch {
        clearStoredToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  async function login(credentials) {
    const result = await loginRequest(credentials);
    setStoredToken(result.accessToken);
    setUser(result.user);
    return result.user;
  }

  async function logout() {
    try {
      await logoutRequest();
    } catch {
      // Ignora falhas de logout remoto para limpar a sessao localmente.
    } finally {
      clearStoredToken();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext, AuthProvider };
