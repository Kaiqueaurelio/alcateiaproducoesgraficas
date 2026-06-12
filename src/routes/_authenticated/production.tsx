import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductionUpdateDialog } from "@/components/ProductionUpdateDialog";
import { BriefingCenter } from "@/components/BriefingCenter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDate, PAYMENT_STATUS_LABEL, PRODUCTION_STATUS_LABEL } from "@/lib/format";
import { Clock3, MessageSquarePlus, Search, UserRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/production")({ component: ProductionBoard });

const COLUMNS = [
  "aguardando_arte",
  "arte_em_criacao",
  "aguardando_aprovacao",
  "aprovado",
  "em_producao",
  "pausado",
  "pronto_para_retirada",
  "entregue",
] as const;
type ProdStatus = (typeof COLUMNS)[number];

function timeAgo(value?: string | null) {
  if (!value) return "Sem atualização";
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `Há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Há ${hours}h`;
  return `Há ${Math.floor(hours / 24)} dias`;
}

function ProductionBoard() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [person, setPerson] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["production-board"],
    queryFn: async () => {
      const [ordersResult, profilesResult] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "*, clients(name,whatsapp), assignee:profiles!orders_assigned_to_fkey(id,full_name,email)",
          )
          .in("production_status", COLUMNS as readonly string[] as any)
          .order("urgent", { ascending: false })
          .order("deadline", { ascending: true }),
        supabase.from("profiles").select("id,full_name,email").order("full_name"),
      ]);
      if (ordersResult.error) throw ordersResult.error;
      return { orders: (ordersResult.data ?? []) as any[], team: profilesResult.data ?? [] };
    },
  });

  const { data: updates } = useQuery({
    queryKey: ["production-updates", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production_updates" as any)
        .select("*, author:profiles!production_updates_author_id_fkey(full_name,email)")
        .eq("order_id", selected.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const filtered = (data?.orders ?? []).filter((order) => {
    const term = search.toLowerCase();
    const matchesSearch =
      !term ||
      [order.clients?.name, order.title, order.current_activity, String(order.number)].some(
        (value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(term),
      );
    return (
      matchesSearch &&
      (person === "all" ||
        (person === "unassigned" ? !order.assigned_to : order.assigned_to === person))
    );
  });

  async function move(id: string, status: ProdStatus) {
    const { error } = await supabase
      .from("orders")
      .update({ production_status: status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ["production-board"] });
    qc.invalidateQueries({ queryKey: ["production-updates"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Central de produção</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe responsáveis, atividades e atualizações em tempo real.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9 sm:w-64"
              placeholder="Buscar OS, cliente ou tarefa"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={person} onValueChange={setPerson}>
            <SelectTrigger className="sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os responsáveis</SelectItem>
              <SelectItem value="unassigned">Sem responsável</SelectItem>
              {(data?.team ?? []).map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.full_name || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((column) => {
          const rows = filtered.filter((order) => order.production_status === column);
          return (
            <section
              key={column}
              className="min-w-[310px] flex-shrink-0"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const id = event.dataTransfer.getData("text/plain");
                if (id) move(id, column);
              }}
            >
              <div className="bg-primary text-primary-foreground rounded-t-xl px-3 py-2.5 text-sm font-semibold flex justify-between">
                <span>{PRODUCTION_STATUS_LABEL[column]}</span>
                <span className="bg-white/10 text-gold rounded-full min-w-6 h-6 grid place-items-center">
                  {rows.length}
                </span>
              </div>
              <div className="bg-muted/40 rounded-b-xl p-2 min-h-[260px] space-y-2">
                {rows.map((order) => (
                  <Card
                    key={order.id}
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData("text/plain", order.id)}
                    className="p-3 cursor-pointer hover:border-gold transition-colors"
                    onClick={() => setSelected(order)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">
                          OS #{order.number}
                        </span>
                        <h3 className="font-semibold text-sm mt-0.5">
                          {order.title || order.clients?.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">{order.clients?.name}</p>
                      </div>
                      {order.urgent && (
                        <Badge className="bg-destructive text-destructive-foreground text-[9px]">
                          URGENTE
                        </Badge>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg bg-muted/60 p-2">
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Fazendo agora
                      </p>
                      <p className="text-xs font-medium mt-1 line-clamp-2">
                        {order.current_activity || "Atividade ainda não informada"}
                      </p>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Progresso</span>
                        <strong>{order.progress || 0}%</strong>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-gold rounded-full"
                          style={{ width: `${order.progress || 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserRound className="w-3 h-3" />
                        {order.assignee?.full_name || order.assignee?.email || "Não atribuído"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock3 className="w-3 h-3" />
                        {timeAgo(order.last_progress_at)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                      <span>Prazo: {fmtDate(order.deadline)}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {PAYMENT_STATUS_LABEL[order.payment_status]}
                      </Badge>
                    </div>
                  </Card>
                ))}
                {!rows.length && (
                  <div className="text-xs text-muted-foreground italic text-center py-8">
                    Nenhuma tarefa
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              OS #{selected?.number} · {selected?.title || selected?.clients?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <Tabs defaultValue="activity" className="space-y-5">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="activity">Equipe e andamento</TabsTrigger>
                <TabsTrigger value="briefing">Briefing e aprovação</TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="space-y-5">
                <div className="grid sm:grid-cols-3 gap-3">
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Responsável</p>
                    <p className="font-semibold mt-1">
                      {selected.assignee?.full_name || selected.assignee?.email || "Não atribuído"}
                    </p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Etapa</p>
                    <p className="font-semibold mt-1">
                      {PRODUCTION_STATUS_LABEL[selected.production_status]}
                    </p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground">Progresso</p>
                    <p className="font-semibold mt-1">{selected.progress || 0}%</p>
                  </Card>
                </div>
                <div className="flex justify-between items-center gap-3 rounded-lg bg-muted/50 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Atividade atual</p>
                    <p className="font-medium">
                      {selected.current_activity || "Ainda não informada"}
                    </p>
                  </div>
                  <Button onClick={() => setUpdateOpen(true)}>
                    <MessageSquarePlus className="w-4 h-4 mr-2" />
                    Atualizar
                  </Button>
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Linha do tempo</h3>
                  <div className="space-y-3">
                    {(updates ?? []).map((update) => (
                      <div key={update.id} className="border-l-2 border-gold pl-4 py-1">
                        <div className="flex flex-wrap justify-between gap-2">
                          <strong className="text-sm">{update.activity}</strong>
                          <span className="text-xs text-muted-foreground">
                            {new Date(update.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {update.author?.full_name || update.author?.email} ·{" "}
                          {PRODUCTION_STATUS_LABEL[update.status]} · {update.progress}%
                        </p>
                        {update.note && <p className="text-sm mt-2">{update.note}</p>}
                      </div>
                    ))}
                    {!updates?.length && (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma atualização registrada.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="briefing">
                <BriefingCenter order={selected} onChanged={refresh} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <ProductionUpdateDialog
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        order={selected}
        onSaved={refresh}
      />
    </div>
  );
}
