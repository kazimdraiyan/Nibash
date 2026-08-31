// global auth state holder
// TODO: save only the token in localStorage and fetch user data from server on page load

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

interface User {
  email: string;
  id: number;
  name: string;
  nid: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  async function fetchUserInfo(authToken: string): Promise<User | null> {
    try {
      const res = await fetch("http://localhost:5000/api/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    } catch {
      return null;
    }
  }

  // On app load, if a token exists, load user info
  // TODO: learn more about useEffect
  useEffect(() => {
    async function restoreSession() {
      if (token) {
        const fetchedUser = await fetchUserInfo(token);
        if (fetchedUser) {
          setUser(fetchedUser);
        } else {
          // if invalid token, clear it from local storage
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    }
    restoreSession();
  }, []);

  const login = async (newToken: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    const fetchedUser = await fetchUserInfo(newToken);
    setUser(fetchedUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
