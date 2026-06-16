import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "administrador" | "atendente" | "producao" | "financeiro" | "vendedor";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (...r: AppRole[]) => boolean;
  isAdmin: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadRoles(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function ensureBuckets() {
    const buckets = ["company-assets", "briefing-files", "arquivos"];
    for (const bucketId of buckets) {
      try {
        const { data: bucket, error: getError } = await supabase.storage.getBucket(bucketId);
        if (getError || !bucket) {
          console.log(`[Storage] Tentando criar bucket: ${bucketId}`);
          const isPublic = bucketId === "company-assets";
          await supabase.storage.createBucket(bucketId, {
            public: isPublic,
            fileSizeLimit: 52428800, // 50MB
          });
        }
      } catch (e) {
        console.error(`[Storage] Erro ao verificar/criar bucket ${bucketId}:`, e);
      }
    }
  }

  async function loadRoles(userId: string) {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const userRoles = (data?.map((r) => r.role as AppRole)) ?? [];
    setRoles(userRoles);
    
    if (userRoles.includes("administrador")) {
      ensureBuckets();
    }
  }

  const value: AuthCtx = {
    user: session?.user ?? null,
    session,
    roles,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
    hasRole: (...r) => r.some((x) => roles.includes(x)),
    isAdmin: roles.includes("administrador"),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  administrador: "Administrador",
  atendente: "Atendente",
  producao: "Produção",
  financeiro: "Financeiro",
  vendedor: "Vendedor",
};
