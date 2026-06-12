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
import { FileUp, Loader2 } from "lucide-react";
import { safeFileName } from "@/lib/briefing";

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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  async function save() {
    const { error } = await supabase
      .from("company_settings")
      .update({
        name: form.name,
        whatsapp: form.whatsapp,
        instagram: form.instagram,
        address: form.address,
        document: form.document,
        logo_url: form.logo_url,
        default_quote_text: form.default_quote_text,
        default_order_text: form.default_order_text,
        default_deadline_days: Number(form.default_deadline_days) || 3,
      })
      .eq("id", form.id);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["company_settings"] });
  }

  async function uploadLogo(file?: File) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["png", "pdf", "cdr", "svg"].includes(extension)) {
      return toast.error("Envie a logo em PNG, PDF, CDR ou SVG.");
    }
    setUploadingLogo(true);
    const path = `logos/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from("company-assets").upload(path, file);
    if (error) {
      setUploadingLogo(false);
      return toast.error(error.message);
    }
    const { data: publicData } = supabase.storage.from("company-assets").getPublicUrl(path);
    const logoUrl = publicData.publicUrl;
    const { error: updateError } = await supabase
      .from("company_settings")
      .update({ logo_url: logoUrl })
      .eq("id", form.id);
    setUploadingLogo(false);
    if (updateError) return toast.error(updateError.message);
    setForm({ ...form, logo_url: logoUrl });
    toast.success("Logo enviada e salva.");
  }

  return (
    <div className="max-w-3xl">
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-primary">Dados da empresa</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Nome</Label>
            <Input
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input
              value={form.whatsapp ?? ""}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
          </div>
          <div>
            <Label>Instagram</Label>
            <Input
              value={form.instagram ?? ""}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Endereço</Label>
            <Input
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input
              value={form.document ?? ""}
              onChange={(e) => setForm({ ...form, document: e.target.value })}
            />
          </div>
          <div>
            <Label>Prazo padrão (dias)</Label>
            <Input
              type="number"
              value={form.default_deadline_days ?? 3}
              onChange={(e) => setForm({ ...form, default_deadline_days: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Logo da empresa</Label>
            <div className="mt-1 grid gap-3 rounded-xl border border-dashed p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-medium">Enviar logo em PNG, PDF, CDR ou SVG</p>
                <p className="text-xs text-muted-foreground">
                  PNG e SVG permitem pré-visualização. Arquivos técnicos ficam armazenados para
                  download e uso futuro.
                </p>
                {form.logo_url && (
                  <a
                    href={form.logo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block truncate text-xs text-primary underline"
                  >
                    {form.logo_url}
                  </a>
                )}
              </div>
              <label>
                <Button type="button" variant="outline" asChild disabled={uploadingLogo}>
                  <span>
                    {uploadingLogo ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileUp className="mr-2 h-4 w-4" />
                    )}
                    {uploadingLogo ? "Enviando..." : "Selecionar logo"}
                  </span>
                </Button>
                <input
                  type="file"
                  className="hidden"
                  accept=".png,.pdf,.cdr,.svg"
                  onChange={(e) => uploadLogo(e.target.files?.[0])}
                />
              </label>
            </div>
            {form.logo_url && /\.(png|svg)(\?|$)/i.test(form.logo_url) && (
              <img
                src={form.logo_url}
                alt="Logo atual"
                className="mt-3 h-32 max-w-full rounded-xl border bg-white object-contain p-3"
              />
            )}
          </div>
          <div className="md:col-span-2">
            <Label>Texto padrão do orçamento</Label>
            <Textarea
              value={form.default_quote_text ?? ""}
              onChange={(e) => setForm({ ...form, default_quote_text: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Texto padrão da OS</Label>
            <Textarea
              value={form.default_order_text ?? ""}
              onChange={(e) => setForm({ ...form, default_order_text: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={save}>Salvar</Button>
      </Card>
    </div>
  );
}
