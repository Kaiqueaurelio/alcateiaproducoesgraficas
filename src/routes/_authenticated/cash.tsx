import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { toast } from "sonner";
import { brl, fmtDate, CASH_IN_CATEGORIES, CASH_OUT_CATEGORIES, PAYMENT_METHODS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/cash")({ component: CashPage });

function CashPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ type: "entrada", description: "", category: "", amount: 0, entry_date: new Date().toISOString().slice(0, 10), payment_method: "", notes: "" });

  const { data } = useQuery({
    queryKey: ["cash"],
    queryFn: async () => {
      const { data } = await supabase.from("cash_entries").select("*, clients(name)").order("entry_date", { ascending: false }).order("created_at", { ascending: false }).limit(300);
      return (data ?? []) as any[];
    },
  });

  const totals = (data ?? []).reduce(
    (acc, e) => {
      if (e.type === "entrada") acc.in += +e.amount; else acc.out += +e.amount;
      return acc;
    }, { in: 0, out: 0 },
  );

  async function save() {
    if (!form.description || !form.amount) return toast.error("Preencha descrição e valor");
    const { error } = await supabase.from("cash_entries").insert({ ...form, amount: Number(form.amount) });
    if (error) return toast.error(error.message);
    toast.success("Lançamento salvo"); setOpen(false);
    setForm({ type: "entrada", description: "", category: "", amount: 0, entry_date: new Date().toISOString().slice(0, 10), payment_method: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["cash"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }
  async function remove(id: string) {
    if (!confirm("Excluir lançamento?")) return;
    const { error } = await supabase.from("cash_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cash"] });
  }

  const cats = form.type === "entrada" ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Entradas</div><div className="text-xl font-bold text-emerald-600">{brl(totals.in)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Saídas</div><div className="text-xl font-bold text-destructive">{brl(totals.out)}</div></Card>
        <Card className="p-4 bg-primary text-primary-foreground"><div className="text-xs text-primary-foreground/80">Saldo</div><div className="text-xl font-bold text-gold">{brl(totals.in - totals.out)}</div></Card>
      </div>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Novo lançamento</Button>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="entrada">Entrada</SelectItem><SelectItem value="saida">Saída</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Descrição *</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Valor *</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Data</Label><Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Categoria</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Forma de pagto</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground"><tr>
              <th className="text-left p-3 w-10"></th>
              <th className="text-left p-3">Data</th>
              <th className="text-left p-3">Descrição</th>
              <th className="text-left p-3 hidden md:table-cell">Categoria</th>
              <th className="text-right p-3">Valor</th>
              <th></th>
            </tr></thead>
            <tbody>
              {(data ?? []).map((e) => (
                <tr key={e.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">{e.type === "entrada" ? <ArrowDownCircle className="w-4 h-4 text-emerald-600" /> : <ArrowUpCircle className="w-4 h-4 text-destructive" />}</td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(e.entry_date)}</td>
                  <td className="p-3">{e.description}<div className="text-xs text-muted-foreground">{e.clients?.name}</div></td>
                  <td className="p-3 hidden md:table-cell"><Badge variant="outline">{e.category || "—"}</Badge></td>
                  <td className={`p-3 text-right font-mono ${e.type === "entrada" ? "text-emerald-600" : "text-destructive"}`}>{e.type === "entrada" ? "+" : "-"} {brl(e.amount)}</td>
                  <td className="p-3"><Button size="icon" variant="ghost" onClick={() => remove(e.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></td>
                </tr>
              ))}
              {!data?.length && (<tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Sem lançamentos</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}