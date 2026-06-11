import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["company_settings"],
    queryFn: async () => {
      const { data } = await supabase.from("company_settings").select("*").limit(1).single();
      return data as any;
    },
  });
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  async function save() {
    const { error } = await supabase.from("company_settings").update({
      name: form.name, whatsapp: form.whatsapp, instagram: form.instagram,
      address: form.address, document: form.document, logo_url: form.logo_url,
      default_quote_text: form.default_quote_text, default_order_text: form.default_order_text,
      default_deadline_days: Number(form.default_deadline_days) || 3,
    }).eq("id", form.id);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["company_settings"] });
  }

  return (
    <div className="max-w-3xl">
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-primary">Dados da empresa</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2"><Label>Nome</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>WhatsApp</Label><Input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
          <div><Label>Instagram</Label><Input value={form.instagram ?? ""} onChange={(e) => setForm({ ...form, instagram: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>CNPJ</Label><Input value={form.document ?? ""} onChange={(e) => setForm({ ...form, document: e.target.value })} /></div>
          <div><Label>Prazo padrão (dias)</Label><Input type="number" value={form.default_deadline_days ?? 3} onChange={(e) => setForm({ ...form, default_deadline_days: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>URL da logo</Label><Input value={form.logo_url ?? ""} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Texto padrão do orçamento</Label><Textarea value={form.default_quote_text ?? ""} onChange={(e) => setForm({ ...form, default_quote_text: e.target.value })} /></div>
          <div className="md:col-span-2"><Label>Texto padrão da OS</Label><Textarea value={form.default_order_text ?? ""} onChange={(e) => setForm({ ...form, default_order_text: e.target.value })} /></div>
        </div>
        <Button onClick={save}>Salvar</Button>
      </Card>
    </div>
  );
}