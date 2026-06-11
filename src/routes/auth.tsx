import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Alcateia Gestão" }] }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo!");
    nav({ to: "/dashboard" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Faça login.");
  }

  async function handleReset() {
    if (!email) return toast.error("Informe o e-mail primeiro");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/auth",
    });
    if (error) return toast.error(error.message);
    toast.success("Link de recuperação enviado.");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, oklch(0.22 0.06 258), oklch(0.32 0.09 258))" }}
    >
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl p-8 border border-border">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-3">
            <span className="text-2xl font-bold text-gold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-primary">Alcateia Gestão</h1>
          <p className="text-sm text-muted-foreground">Alcateia's Produções Gráficas</p>
        </div>
        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="login">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-3">
              <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Entrando..." : "Entrar"}</Button>
              <button type="button" onClick={handleReset} className="text-xs text-muted-foreground hover:text-primary block w-full text-center mt-2">Esqueci minha senha</button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-3">
              <div><Label>Nome</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></div>
              <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <div><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></div>
              <Button type="submit" disabled={loading} className="w-full">{loading ? "Criando..." : "Criar conta"}</Button>
              <p className="text-xs text-muted-foreground text-center mt-2">A primeira conta criada vira administrador automaticamente.</p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}