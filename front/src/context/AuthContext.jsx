import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const DEFAULT_USER = {
  firstName: "Amine",
  lastName: "Ben Salah",
  email: "amine.bensalah@laposte.tn",
  matricule: "LP-23847",
  role: "Agent Enquêteur",
  registeredAt: "2023-04-12",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = (u) => setUser(u);
  const logout = () => setUser(null);
  const updateUser = (patch) =>
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { DEFAULT_USER };