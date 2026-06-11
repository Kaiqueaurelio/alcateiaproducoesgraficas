import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { brl, PAYMENT_METHODS, PRODUCTION_STATUS_LABEL } from "@/lib/format";
import { generateOrderPDF } from "@/lib/pdf";

export interface OrderEditorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId?: string | null;
  onSaved?: () => void;
  fromQuoteId?: string | null;
}

interface Item { id?: string; description: string; quantity: number; unit_price: number; subtotal: number; service_id?: string | null }

const PROD_STATUSES = Object.keys(PRODUCTION_STATUS_LABEL);

export function OrderEditor({ open, onOpenChange, orderId, onSaved, fromQuoteId }: OrderEditorProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; base_price: number }[]>([]);
  const [form, setForm] = useState<any>({
    client_id: "", title: "", description: "", measurements: "", material: "", finishing: "",
    client_notes: "", internal_notes: "", total: 0, paid: 0, payment_method: "",
    production_status: "aguardando_arte", deadline: "", urgent: false,
  });
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase.from("clients").select("id,name").order("name").then(({ data }) => setClients(data ?? []));
    supabase.from("services").select("id,name,base_price").eq("active", true).order("name").then(({ data }) => setServices(data ?? []));
    if (orderId) {
      (async () => {
        const { data: o } = await supabase.from("orders").select("*").eq("id", orderId).single();
        const { data: its } = await supabase.from("order_items").select("*").eq("order_id", orderId);
        if (o) setForm({ ...o, deadline: o.deadline ?? "" });
        setItems((its ?? []).map((i: any) => ({ id: i.id, description: i.description, quantity: +i.quantity, unit_price: +i.unit_price, subtotal: +i.subtotal, service_id: i.service_id })));
      })();
    } else if (fromQuoteId) {
      (async () => {
        const { data: q } = await supabase.from("quotes").select("*").eq("id", fromQuoteId).single();
        const { data: qi } = await supabase.from("quote_items").select("*").eq("quote_id", fromQuoteId);
        if (q) setForm((f: any) => ({ ...f, client_id: q.client_id, description: q.description ?? "", total: +q.total, quote_id: q.id }));
        setItems((qi ?? []).map((i: any) => ({ description: i.description, quantity: +i.quantity, unit_price: +i.unit_price, subtotal: +i.subtotal, service_id: i.service_id })));
      })();
    } else {
      setForm({ client_id: "", title: "", description: "", measurements: "", material: "", finishing: "", client_notes: "", internal_notes: "", total: 0, paid: 0, payment_method: "", production_status: "aguardando_arte", deadline: "", urgent: false });
      setItems([]);
    }
  }, [open, orderId, fromQuoteId]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((arr) => {
      const next = arr.slice();
      next[idx] = { ...next[idx], ...patch };
      next[idx].subtotal = (Number(next[idx].quantity) || 0) * (Number(next[idx].unit_price) || 0);
      return next;
    });
  }
  const total = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);

  async function save() {
    if (!form.client_id) return toast.error("Selecione um cliente");
    if (!items.length) return toast.error("Adicione ao menos um item");
    setLoading(true);
    const payload = {
      client_id: form.client_id, title: form.title, description: form.description,
      measurements: form.measurements, material: form.material, finishing: form.finishing,
      client_notes: form.client_notes, internal_notes: form.internal_notes,
      total, paid: Number(form.paid) || 0, payment_method: form.payment_method || null,
      production_status: form.production_status,
      deadline: form.deadline || null, urgent: !!form.urgent,
      quote_id: form.quote_id ?? null,
    };
    let id = orderId;
    if (id) {
      const { error } = await supabase.from("orders").update(payload).eq("id", id);
      if (error) { setLoading(false); return toast.error(error.message); }
      await supabase.from("order_items").delete().eq("order_id", id);
    } else {
      const { data, error } = await supabase.from("orders").insert(payload).select("id").single();
      if (error || !data) { setLoading(false); return toast.error(error?.message || "Erro"); }
      id = data.id;
    }
    const { error: e2 } = await supabase.from("order_items").insert(
      items.map((i) => ({ order_id: id, description: i.description, quantity: i.quantity, unit_price: i.unit_price, subtotal: i.subtotal, service_id: i.service_id ?? null })),
    );
    setLoading(false);
    if (e2) return toast.error(e2.message);
    toast.success("Ordem salva");
    onOpenChange(false);
    onSaved?.();
  }

  async function printPDF() {
    if (!orderId) return toast.error("Salve a OS antes de gerar o PDF");
    const [{ data: o }, { data: c }, { data: its }, { data: comp }] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).single(),
      supabase.from("clients").select("*").eq("id", form.client_id).single(),
      supabase.from("order_items").select("*").eq("order_id", orderId),
      supabase.from("company_settings").select("*").limit(1).single(),
    ]);
    if (!o || !c || !comp) return toast.error("Dados incompletos");
    generateOrderPDF({ company: comp as any, order: o as any, client: c as any, items: (its ?? []) as any });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{orderId ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2"><Label>Cliente *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Prazo</Label><Input type="date" value={form.deadline ?? ""} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Título / Serviço</Label><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Material</Label><Input value={form.material ?? ""} onChange={(e) => setForm({ ...form, material: e.target.value })} /></div>
            <div><Label>Medidas</Label><Input value={form.measurements ?? ""} onChange={(e) => setForm({ ...form, measurements: e.target.value })} /></div>
            <div><Label>Acabamento</Label><Input value={form.finishing ?? ""} onChange={(e) => setForm({ ...form, finishing: e.target.value })} /></div>
          </div>
          <div><Label>Descrição detalhada</Label><Textarea rows={2} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Itens</Label>
              <Button size="sm" variant="outline" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0, subtotal: 0 }])}><Plus className="w-3 h-3 mr-1" />Adicionar</Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-muted/30 p-2 rounded">
                  <div className="col-span-12 md:col-span-5">
                    <Select value={it.service_id ?? ""} onValueChange={(v) => {
                      const s = services.find((x) => x.id === v);
                      updateItem(idx, { service_id: v, description: s?.name ?? it.description, unit_price: s?.base_price ?? it.unit_price });
                    }}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Serviço (opcional)" /></SelectTrigger>
                      <SelectContent>{services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="mt-1" placeholder="Descrição" value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                  </div>
                  <div className="col-span-3 md:col-span-2"><Input type="number" step="0.01" placeholder="Qtd" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} /></div>
                  <div className="col-span-4 md:col-span-2"><Input type="number" step="0.01" placeholder="Unit." value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} /></div>
                  <div className="col-span-4 md:col-span-2 text-right font-mono text-sm">{brl(it.subtotal)}</div>
                  <div className="col-span-1"><Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="w-4 h-4 text-destructive" /></Button></div>
                </div>
              ))}
              {!items.length && <div className="text-sm text-muted-foreground italic">Sem itens.</div>}
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div className="md:col-span-2 text-right">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-2xl font-bold text-primary">{brl(total)}</div>
            </div>
            <div><Label>Entrada / Pago</Label><Input type="number" step="0.01" value={form.paid} onChange={(e) => setForm({ ...form, paid: Number(e.target.value) })} /></div>
            <div><Label>Forma de pagto</Label>
              <Select value={form.payment_method ?? ""} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div><Label>Status produção</Label>
              <Select value={form.production_status} onValueChange={(v) => setForm({ ...form, production_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROD_STATUSES.map((s) => <SelectItem key={s} value={s}>{PRODUCTION_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2"><Switch checked={!!form.urgent} onCheckedChange={(v) => setForm({ ...form, urgent: v })} /><Label>Marcar como urgente</Label></div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Observações do cliente</Label><Textarea rows={2} value={form.client_notes ?? ""} onChange={(e) => setForm({ ...form, client_notes: e.target.value })} /></div>
            <div><Label>Observações internas</Label><Textarea rows={2} value={form.internal_notes ?? ""} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {orderId && <Button variant="outline" onClick={printPDF}><FileText className="w-4 h-4 mr-1" />PDF</Button>}
          <Button onClick={save} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}