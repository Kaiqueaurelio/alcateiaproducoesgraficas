import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Alcateia Gestão" }] }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (loading) return;
    nav({ to: session ? "/dashboard" : "/auth", replace: true });
  }, [session, loading, nav]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground">Carregando...</div>
    </div>
  );
}
