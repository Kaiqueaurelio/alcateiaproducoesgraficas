import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brl, fmtDate } from "@/lib/format";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/receivables")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["receivables"],
    queryFn: async () => {
      const { data } = await supabase.from("receivables").select("*, clients(name), orders(number)").order("due_date", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  async function markPaid(r: any) {
    if (!confirm(`Marcar como pago e lançar ${brl(r.amount)} no caixa?`)) return;
    const updates = [
      supabase.from("receivables").update({ status: "pago", paid_at: new Date().toISOString() }).eq("id", r.id),
      supabase.from("cash_entries").insert({
        type: "entrada", description: `Pagamento OS #${r.orders?.number ?? ""}`,
        category: "Pagamento de OS", amount: r.amount, client_id: r.client_id, order_id: r.order_id, receivable_id: r.id,
        payment_method: r.payment_method,
      }),
    ];
    if (r.order_id) {
      const { data: o } = await supabase.from("orders").select("paid,total").eq("id", r.order_id).single();
      if (o) updates.push(supabase.from("orders").update({ paid: o.total }).eq("id", r.order_id) as any);
    }
    const results = await Promise.all(updates);
    const err = results.find((r: any) => r.error);
    if (err) return toast.error((err as any).error.message);
    toast.success("Marcado como pago");
    qc.invalidateQueries({ queryKey: ["receivables"] });
    qc.invalidateQueries({ queryKey: ["cash"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  }

  const totals = (data ?? []).reduce((s: any, r) => {
    if (r.status === "pendente") s.pending += +r.amount;
    if (r.status === "pago") s.paid += +r.amount;
    if (r.status === "pendente" && r.due_date && new Date(r.due_date) < new Date()) s.overdue += +r.amount;
    return s;
  }, { pending: 0, paid: 0, overdue: 0 });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Pendente</div><div className="text-xl font-bold text-primary">{brl(totals.pending)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Recebido</div><div className="text-xl font-bold text-emerald-600">{brl(totals.paid)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Vencido</div><div className="text-xl font-bold text-destructive">{brl(totals.overdue)}</div></Card>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground"><tr>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">OS</th>
              <th className="text-left p-3">Vencimento</th>
              <th className="text-right p-3">Valor</th>
              <th className="text-left p-3">Status</th>
              <th></th>
            </tr></thead>
            <tbody>
              {(data ?? []).map((r) => {
                const overdue = r.status === "pendente" && r.due_date && new Date(r.due_date) < new Date();
                return (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="p-3">{r.clients?.name}</td>
                    <td className="p-3 font-mono">{r.orders?.number ? `#${r.orders.number}` : "—"}</td>
                    <td className="p-3">{fmtDate(r.due_date)}</td>
                    <td className="p-3 text-right font-mono">{brl(r.amount)}</td>
                    <td className="p-3"><Badge variant={overdue ? "destructive" : "outline"}>{overdue ? "Vencido" : r.status}</Badge></td>
                    <td className="p-3 text-right">
                      {r.status !== "pago" && <Button size="sm" variant="outline" onClick={() => markPaid(r)}><Check className="w-4 h-4 mr-1" />Receber</Button>}
                    </td>
                  </tr>
                );
              })}
              {!data?.length && (<tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma conta a receber</td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}