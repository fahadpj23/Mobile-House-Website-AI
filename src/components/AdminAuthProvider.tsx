"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { adminAuth } from "@/lib/firebase";
import {
  getAdminDoc,
  isSuperAdmin,
  canAccess as canAccessFn,
} from "@/lib/adminAuth";
import type { AdminUser, AdminSection } from "@/lib/types";

interface AdminAuthCtx {
  user: User | null;
  admin: AdminUser | null;
  loading: boolean;
  isSuper: boolean;
  canAccess: (section: AdminSection) => boolean;
  refreshAdmin: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AdminAuthCtx>({} as AdminAuthCtx);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAdmin = useCallback(async (u: User | null) => {
    if (!u) {
      setAdmin(null);
      return;
    }
    try {
      const d = await getAdminDoc(u);
      setAdmin(d);
    } catch (err) {
      console.error("[AdminAuth] loadAdmin failed:", err);
      setAdmin(null);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(adminAuth, async (u) => {
      setUser(u);
      await loadAdmin(u);
      setLoading(false);
    });
    return () => unsub();
  }, [loadAdmin]);

  const refreshAdmin = async () => {
    await loadAdmin(adminAuth.currentUser);
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(adminAuth, email, password);
  };

  // ★ Logout: clear state immediately, sign out, then hard-redirect
  const logout = async () => {
    // Wipe local state first so no UI flickers or hangs
    setUser(null);
    setAdmin(null);

    try {
      await signOut(adminAuth);
    } catch (err) {
      console.warn("[AdminAuth] signOut failed:", err);
    }

    // Hard redirect — bypasses any router state and stops the loading overlay
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
  };

  const isSuper = isSuperAdmin(admin);
  const canAccess = (section: AdminSection) => canAccessFn(admin, section);

  return (
    <Ctx.Provider
      value={{
        user,
        admin,
        loading,
        isSuper,
        canAccess,
        refreshAdmin,
        login,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAdminAuth = () => useContext(Ctx);
