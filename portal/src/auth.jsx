import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, setToken, getToken, setAuthErrorHandler } from "./services/index.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(""); // why the user was signed out

  // the API re-checks every session server-side; react to revocation / forced change
  useEffect(() => {
    setAuthErrorHandler((status, code, message) => {
      if (code === "PASSWORD_CHANGE_REQUIRED") {
        setUser((u) => (u ? { ...u, mustChangePassword: true } : u));
        return;
      }
      setToken(null);
      setUser(null);
      setNotice(message || "Your session has ended. Please sign in again.");
    });
    return () => setAuthErrorHandler(null);
  }, []);

  // validate an existing token on first load
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!getToken()) { setLoading(false); return; }
      try {
        const { user } = await auth.me();
        if (alive) setUser(user);
      } catch {
        setToken(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await auth.login(email, password);
    setToken(token);
    setNotice("");
    setUser(user);
    return user;
  }, []);

  // signup does not sign you in: the account activates from the emailed confirmation link
  const register = useCallback(async (payload) => {
    const r = await auth.register(payload);
    return r.message;
  }, []);

  // used by the email-confirmation page, which receives a fresh session
  const adoptSession = useCallback((token, user) => {
    setToken(token);
    setNotice("");
    setUser(user);
  }, []);

  // changing the password revokes every old token; the API returns a fresh one
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { token, user } = await auth.changePassword(currentPassword, newPassword);
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    // revoke every session server-side (best effort), then forget the token locally
    if (getToken()) auth.logout().catch(() => {});
    setToken(null);
    setNotice("");
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, notice, login, register, adoptSession, changePassword, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
