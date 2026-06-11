import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { brl, fmtDate, PAYMENT_STATUS_LABEL, PRODUCTION_STATUS_LABEL } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/production")({ component: Kanban });

const COLUMNS = [
  "aguardando_arte", "arte_em_criacao", "aguardando_aprovacao",
  "aprovado", "em_producao", "pronto_para_retirada", "entregue",
];

function Kanban() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["kanban"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, clients(name)").in("production_status", COLUMNS).order("deadline", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  async function move(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ production_status: status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["kanban"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {COLUMNS.map((col) => {
        const rows = (data ?? []).filter((o) => o.production_status === col);
        return (
          <div key={col} className="min-w-[280px] flex-shrink-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) move(id, col); }}>
            <div className="bg-primary text-primary-foreground rounded-t-lg px-3 py-2 text-sm font-semibold flex justify-between">
              <span>{PRODUCTION_STATUS_LABEL[col]}</span>
              <span className="text-gold">{rows.length}</span>
            </div>
            <div className="bg-muted/40 rounded-b-lg p-2 min-h-[200px] space-y-2">
              {rows.map((o) => (
                <Card key={o.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", o.id)}
                  className="p-3 cursor-grab active:cursor-grabbing">
                  <div className="flex justify-between text-xs text-muted-foreground"><span className="font-mono">#{o.number}</span><span>{fmtDate(o.deadline)}</span></div>
                  <div className="font-medium text-sm mt-1">{o.clients?.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{o.title || o.description}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-mono text-sm">{brl(o.total)}</span>
                    <Badge variant="outline" className="text-[10px]">{PAYMENT_STATUS_LABEL[o.payment_status]}</Badge>
                  </div>
                  {o.urgent && <Badge className="mt-1 bg-destructive text-destructive-foreground text-[10px]">URGENTE</Badge>}
                </Card>
              ))}
              {!rows.length && <div className="text-xs text-muted-foreground italic text-center py-4">Vazio</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}