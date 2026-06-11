import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { brl, fmtDate, PRODUCTION_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/format";
import { OrderEditor } from "@/components/OrderEditor";

export const Route = createFileRoute("/_authenticated/orders")({ component: OrdersPage });

function OrdersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["orders", search],
    queryFn: async () => {
      let q = supabase.from("orders").select("*, clients(name)").order("created_at", { ascending: false }).limit(200);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      return search ? rows.filter((r) => (r.clients?.name ?? "").toLowerCase().includes(search.toLowerCase()) || String(r.number).includes(search)) : rows;
    },
  });

  async function remove(id: string, number: number) {
    if (!confirm(`Excluir OS #${number}? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    qc.invalidateQueries({ queryKey: ["orders"] });
  }

  function isOverdue(o: any) { return o.deadline && new Date(o.deadline) < new Date() && o.production_status !== "entregue" && o.production_status !== "cancelado"; }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por cliente ou nº" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Nova OS</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="text-left p-3">Nº</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3 hidden md:table-cell">Prazo</th>
                <th className="text-left p-3 hidden md:table-cell">Status</th>
                <th className="text-left p-3 hidden lg:table-cell">Pagamento</th>
                <th className="text-right p-3">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((o: any) => (
                <tr key={o.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono">#{o.number}</td>
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-2">{o.clients?.name}
                      {o.urgent && <Badge className="bg-destructive text-destructive-foreground">Urgente</Badge>}
                      {isOverdue(o) && <AlertTriangle className="w-3 h-3 text-destructive" />}
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell">{fmtDate(o.deadline)}</td>
                  <td className="p-3 hidden md:table-cell"><Badge variant="outline">{PRODUCTION_STATUS_LABEL[o.production_status]}</Badge></td>
                  <td className="p-3 hidden lg:table-cell"><Badge variant="outline">{PAYMENT_STATUS_LABEL[o.payment_status]}</Badge></td>
                  <td className="p-3 text-right font-mono">{brl(o.total)}</td>
                  <td className="p-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditId(o.id); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(o.id, o.number)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {!data?.length && (<tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma OS cadastrada</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
      <OrderEditor open={open} onOpenChange={setOpen} orderId={editId} onSaved={() => qc.invalidateQueries({ queryKey: ["orders"] })} />
    </div>
  );
}