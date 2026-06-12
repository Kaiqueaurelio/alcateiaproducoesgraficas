import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Send, UserCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { brl, fmtDate, fmtDateTime, PRODUCTION_STATUS_LABEL } from "@/lib/format";

const PROD_STATUSES = Object.keys(PRODUCTION_STATUS_LABEL);

export interface ProductionDetailProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string | null;
  onChanged?: () => void;
}

export function ProductionDetail({ open, onOpenChange, orderId, onChanged }: ProductionDetailProps) {
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [assignee, setAssignee] = useState("");
  const [note, setNote] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!orderId) return;
    const { data: o } = await supabase.from("orders").select("*, clients(name, phone)").eq("id", orderId).single();
    const { data: u } = await supabase.from("production_updates").select("*").eq("order_id", orderId).order("created_at", { ascending: false });
    setOrder(o);
    setUpdates(u ?? []);
    setAssignee(o?.assignee_name ?? "");
    setNewStatus(o?.production_status ?? "");
  }

  useEffect(() => { if (open && orderId) { load(); setNote(""); } }, [open, orderId]);

  async function saveAssignee() {
    if (!orderId) return;
    const { error } = await supabase.from("orders").update({ assignee_name: assignee || null }).eq("id", orderId);
    if (error) return toast.error(error.message);
    toast.success("Responsável atualizado");
    onChanged?.();
    load();
  }

  async function addUpdate() {
    if (!orderId || !note.trim()) return toast.error("Escreva uma atualização");
    setSaving(true);
    const authorName = assignee || user?.email?.split("@")[0] || "Usuário";
    const statusChanged = newStatus && newStatus !== order?.production_status;
    const { error } = await supabase.from("production_updates").insert({
      order_id: orderId, author_id: user?.id ?? null, author_name: authorName,
      status: statusChanged ? (newStatus as any) : null, note: note.trim(),
    });
    if (error) { setSaving(false); return toast.error(error.message); }
    if (statusChanged) {
      await supabase.from("orders").update({ production_status: newStatus as any }).eq("id", orderId);
    }
    setNote("");
    setSaving(false);
    toast.success("Atualização adicionada");
    onChanged?.();
    load();
  }

  async function delUpdate(id: string) {
    if (!confirm("Excluir esta atualização?")) return;
    const { error } = await supabase.from("production_updates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  if (!order) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><div className="text-sm text-muted-foreground p-4">Carregando…</div></DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground">#{order.number}</span>
            <span>{order.clients?.name}</span>
            {order.urgent && <Badge className="bg-destructive text-destructive-foreground">URGENTE</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-muted-foreground">Prazo</div><div className="font-medium">{fmtDate(order.deadline)}</div></div>
            <div><div className="text-xs text-muted-foreground">Status</div><Badge variant="outline" className="mt-0.5">{PRODUCTION_STATUS_LABEL[order.production_status]}</Badge></div>
            <div><div className="text-xs text-muted-foreground">Total</div><div className="font-mono font-medium">{brl(order.total)}</div></div>
            <div><div className="text-xs text-muted-foreground">Pago</div><div className="font-mono font-medium">{brl(order.paid)}</div></div>
          </div>

          {(order.title || order.description || order.material || order.measurements) && (
            <div className="bg-muted/30 rounded p-3 text-sm space-y-1">
              {order.title && <div><span className="text-muted-foreground">Serviço: </span>{order.title}</div>}
              {order.material && <div><span className="text-muted-foreground">Material: </span>{order.material}</div>}
              {order.measurements && <div><span className="text-muted-foreground">Medidas: </span>{order.measurements}</div>}
              {order.description && <div className="text-muted-foreground">{order.description}</div>}
            </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="text-xs">Responsável</Label>
              <Input placeholder="Quem está executando" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
            </div>
            <Button variant="outline" onClick={saveAssignee}><UserCircle2 className="w-4 h-4 mr-1" />Atribuir</Button>
          </div>

          <div className="border rounded-lg p-3 bg-card space-y-2">
            <Label className="text-sm font-semibold text-primary">Nova atualização</Label>
            <Textarea rows={2} placeholder="Ex.: Iniciei a arte do Instagram, devo terminar em 2h"
              value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue placeholder="Mudar status (opcional)" /></SelectTrigger>
                  <SelectContent>{PROD_STATUSES.map((s) => <SelectItem key={s} value={s}>{PRODUCTION_STATUS_LABEL[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button onClick={addUpdate} disabled={saving}><Send className="w-4 h-4 mr-1" />Postar</Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-primary mb-2 flex items-center gap-2"><Clock className="w-4 h-4" />Linha do tempo</h4>
            <div className="space-y-2">
              {updates.map((u) => (
                <div key={u.id} className="border-l-2 border-gold pl-3 py-1 group">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-primary">{u.author_name ?? "—"}</span>
                      <span className="text-muted-foreground"> · {fmtDateTime(u.created_at)}</span>
                    </div>
                    {u.author_id === user?.id && (
                      <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 w-6" onClick={() => delUpdate(u.id)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  {u.status && <Badge variant="outline" className="text-[10px] mt-1">→ {PRODUCTION_STATUS_LABEL[u.status]}</Badge>}
                  <div className="text-sm mt-1 whitespace-pre-wrap">{u.note}</div>
                </div>
              ))}
              {!updates.length && <div className="text-sm text-muted-foreground italic">Sem atualizações ainda. Adicione a primeira acima.</div>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}