import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { brl, fmtDate, QUOTE_STATUS_LABEL } from "@/lib/format";
import { generateQuotePDF } from "@/lib/pdf";
import { OrderEditor } from "@/components/OrderEditor";

export const Route = createFileRoute("/_authenticated/quotes")({ component: QuotesPage });

type Item = { id?: string; description: string; quantity: number; unit_price: number; subtotal: number; service_id?: string | null };

function QuotesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [convertFrom, setConvertFrom] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data } = await supabase.from("quotes").select("*, clients(name)").order("created_at", { ascending: false }).limit(200);
      return (data ?? []) as any[];
    },
  });

  async function remove(id: string, n: number) {
    if (!confirm(`Excluir orçamento #${n}?`)) return;
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["quotes"] });
  }
  async function printQuote(id: string) {
    const [{ data: q }, { data: c }, { data: its }, { data: comp }] = await Promise.all([
      supabase.from("quotes").select("*").eq("id", id).single(),
      supabase.from("quotes").select("client_id, clients(*)").eq("id", id).single().then(async (r) => ({ data: (r.data as any)?.clients })),
      supabase.from("quote_items").select("*").eq("quote_id", id),
      supabase.from("company_settings").select("*").limit(1).single(),
    ]);
    if (!q || !c || !comp) return toast.error("Dados incompletos");
    generateQuotePDF({ company: comp as any, quote: q as any, client: c as any, items: (its ?? []) as any });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Novo orçamento</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground"><tr>
              <th className="text-left p-3">Nº</th><th className="text-left p-3">Cliente</th>
              <th className="text-left p-3 hidden md:table-cell">Status</th>
              <th className="text-left p-3 hidden md:table-cell">Validade</th>
              <th className="text-right p-3">Total</th><th></th>
            </tr></thead>
            <tbody>
              {(data ?? []).map((q: any) => (
                <tr key={q.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono">#{q.number}</td>
                  <td className="p-3">{q.clients?.name}</td>
                  <td className="p-3 hidden md:table-cell"><Badge variant="outline">{QUOTE_STATUS_LABEL[q.status]}</Badge></td>
                  <td className="p-3 hidden md:table-cell">{fmtDate(q.validity_date)}</td>
                  <td className="p-3 text-right font-mono">{brl(q.total)}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {q.status === "aprovado" && (
                      <Button size="icon" variant="ghost" title="Gerar OS" onClick={() => { setConvertFrom(q.id); }}>
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => printQuote(q.id)}><FileText className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditId(q.id); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(q.id, q.number)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {!data?.length && (<tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum orçamento</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>

      <QuoteEditor open={open} onOpenChange={setOpen} id={editId} onSaved={() => qc.invalidateQueries({ queryKey: ["quotes"] })} />
      <OrderEditor
        open={!!convertFrom}
        onOpenChange={(v) => { if (!v) setConvertFrom(null); }}
        fromQuoteId={convertFrom}
        onSaved={() => { setConvertFrom(null); qc.invalidateQueries({ queryKey: ["quotes"] }); qc.invalidateQueries({ queryKey: ["orders"] }); }}
      />
    </div>
  );
}

function QuoteEditor({ open, onOpenChange, id, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; id: string | null; onSaved: () => void }) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; base_price: number }[]>([]);
  const [form, setForm] = useState<any>({ client_id: "", description: "", discount: 0, validity_date: "", notes: "", status: "em_analise" });
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase.from("clients").select("id,name").order("name").then(({ data }) => setClients(data ?? []));
    supabase.from("services").select("id,name,base_price").eq("active", true).order("name").then(({ data }) => setServices(data ?? []));
    if (id) {
      Promise.all([
        supabase.from("quotes").select("*").eq("id", id).single(),
        supabase.from("quote_items").select("*").eq("quote_id", id),
      ]).then(([q, its]) => {
        if (q.data) setForm({ ...q.data, validity_date: q.data.validity_date ?? "" });
        setItems((its.data ?? []).map((i: any) => ({ id: i.id, description: i.description, quantity: +i.quantity, unit_price: +i.unit_price, subtotal: +i.subtotal, service_id: i.service_id })));
      });
    } else {
      setForm({ client_id: "", description: "", discount: 0, validity_date: "", notes: "", status: "em_analise" });
      setItems([]);
    }
  }, [open, id]);

  function update(idx: number, patch: Partial<Item>) {
    setItems((arr) => {
      const n = arr.slice();
      n[idx] = { ...n[idx], ...patch };
      n[idx].subtotal = (Number(n[idx].quantity) || 0) * (Number(n[idx].unit_price) || 0);
      return n;
    });
  }
  const subtotal = items.reduce((s, i) => s + (+i.subtotal || 0), 0);
  const total = Math.max(0, subtotal - (Number(form.discount) || 0));

  async function save() {
    if (!form.client_id) return toast.error("Selecione cliente");
    if (!items.length) return toast.error("Adicione itens");
    const payload = { client_id: form.client_id, description: form.description, discount: Number(form.discount) || 0, total, validity_date: form.validity_date || null, notes: form.notes, status: form.status };
    let qid: string | null = id;
    if (qid) {
      const res = await supabase.from("quotes").update(payload).eq("id", qid);
      if (res.error) return toast.error(res.error.message);
    } else {
      const res = await supabase.from("quotes").insert(payload).select("id").single();
      if (res.error || !res.data) return toast.error(res.error?.message || "Erro");
      qid = res.data.id;
    }
    await supabase.from("quote_items").delete().eq("quote_id", qid);
    const { error } = await supabase.from("quote_items").insert(items.map((i) => ({ quote_id: qid!, description: i.description, quantity: i.quantity, unit_price: i.unit_price, subtotal: i.subtotal, service_id: i.service_id ?? null })));
    if (error) return toast.error(error.message);
    toast.success("Salvo"); onOpenChange(false); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{id ? "Editar" : "Novo"} orçamento</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2"><Label>Cliente *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Validade</Label><Input type="date" value={form.validity_date ?? ""} onChange={(e) => setForm({ ...form, validity_date: e.target.value })} /></div>
          </div>
          <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          <div>
            <div className="flex items-center justify-between mb-1"><Label>Itens</Label>
              <Button size="sm" variant="outline" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0, subtotal: 0 }])}><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-muted/30 p-2 rounded mb-2">
                <div className="col-span-12 md:col-span-5">
                  <Select value={it.service_id ?? ""} onValueChange={(v) => { const s = services.find((x) => x.id === v); update(idx, { service_id: v, description: s?.name ?? it.description, unit_price: s?.base_price ?? it.unit_price }); }}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Serviço" /></SelectTrigger>
                    <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input className="mt-1" placeholder="Descrição" value={it.description} onChange={(e) => update(idx, { description: e.target.value })} />
                </div>
                <div className="col-span-3 md:col-span-2"><Input type="number" step="0.01" value={it.quantity} onChange={(e) => update(idx, { quantity: Number(e.target.value) })} /></div>
                <div className="col-span-4 md:col-span-2"><Input type="number" step="0.01" value={it.unit_price} onChange={(e) => update(idx, { unit_price: Number(e.target.value) })} /></div>
                <div className="col-span-4 md:col-span-2 text-right font-mono text-sm">{brl(it.subtotal)}</div>
                <div className="col-span-1"><Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>Desconto</Label><Input type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(QUOTE_STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-2xl font-bold text-primary">{brl(total)}</div>
            </div>
          </div>
          <div><Label>Observações</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}