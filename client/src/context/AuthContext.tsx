import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export interface User {
  email: string;
  id: number;
  name: string;
  nid: string;
  phone: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, initialUserData?: User) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token")
  );
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    // If there is a token, we must verify it against /api/auth/me
    return Boolean(localStorage.getItem("token"));
  });

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

  // Restore & verify session on app mount
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const currentToken = localStorage.getItem("token");
      if (currentToken) {
        const fetchedUser = await fetchUserInfo(currentToken);
        if (isMounted) {
          if (fetchedUser) {
            setUser(fetchedUser);
            localStorage.setItem("user", JSON.stringify(fetchedUser));
          } else {
            // Invalid or expired token
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setToken(null);
            setUser(null);
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (newToken: string, initialUserData?: User) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    if (initialUserData) {
      setUser(initialUserData);
      localStorage.setItem("user", JSON.stringify(initialUserData));
    }
    const fetchedUser = await fetchUserInfo(newToken);
    if (fetchedUser) {
      setUser(fetchedUser);
      localStorage.setItem("user", JSON.stringify(fetchedUser));
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
