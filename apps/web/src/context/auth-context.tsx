"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

export interface User {
  id: string;
  name: string;
  email: string | null;
  walletAddress: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (name: string, email?: string) => void;
  logout: () => void;
  /** For future Privy integration */
  connectWallet: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Demo auth provider — stores user in localStorage.
 * Replace with Privy when NEXT_PUBLIC_PRIVY_APP_ID is configured.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("arcade-user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((name: string, email?: string) => {
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email: email || null,
      walletAddress: null,
    };
    setUser(newUser);
    localStorage.setItem("arcade-user", JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("arcade-user");
  }, []);

  const connectWallet = useCallback(() => {
    // TODO: Wire up Privy/wagmi wallet connection
    alert("Wallet connection requires Privy App ID. Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local");
  }, []);

  return (
    <AuthContext value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      connectWallet,
    }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
