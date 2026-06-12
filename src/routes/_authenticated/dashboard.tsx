import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import { OrderEditor } from "@/components/OrderEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, PRODUCTION_STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

const STATUS_COLORS: Record<string, string> = {
  aguardando: "#94a3b8",
  em_producao: "#0f7052",
  arte: "#315b9b",
  impressao: "#d7a52d",
  acabamento: "#e1783f",
  pronto_para_retirada: "#22a06b",
};

function Dashboard() {
  const qc = useQueryClient();
  const [newOrderOpen, setNewOrderOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date();
      monthStart.setDate(1);
      const [cashResult, ordersResult, receivablesResult, updatesResult] = await Promise.all([
        supabase.from("cash_entries").select("type,amount,entry_date"),
        supabase
          .from("orders")
          .select("*, clients(name), assignee:profiles!orders_assigned_to_fkey(id,full_name,email)")
          .order("updated_at", { ascending: false }),
        supabase.from("receivables").select("amount,status,due_date"),
        supabase
          .from("production_updates" as any)
          .select(
            "*, orders(number,title), author:profiles!production_updates_author_id_fkey(full_name,email)",
          )
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (ordersResult.error) throw ordersResult.error;
      const cash = cashResult.data ?? [];
      const orders = (ordersResult.data ?? []) as any[];
      const receivables = receivablesResult.data ?? [];
      const active = orders.filter(
        (order) => !["entregue", "cancelado"].includes(order.production_status),
      );
      const overdue = active.filter(
        (order) => order.deadline && new Date(`${order.deadline}T23:59:59`) < new Date(),
      );
      const stale = active.filter((order) => {
        if (!order.assigned_to) return false;
        const reference = order.last_progress_at || order.updated_at || order.created_at;
        return Date.now() - new Date(reference).getTime() > 24 * 60 * 60 * 1000;
      });
      const unassigned = active.filter((order) => !order.assigned_to);
      const ready = active.filter((order) => order.production_status === "pronto_para_retirada");
      const monthRevenue = cash
        .filter((entry) => entry.type === "entrada" && new Date(entry.entry_date) >= monthStart)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      const receivable = receivables
        .filter((entry) => entry.status === "pendente")
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      const todayEntries = cash
        .filter((entry) => entry.type === "entrada" && entry.entry_date === today)
        .reduce((sum, entry) => sum + Number(entry.amount), 0);

      const workload = new Map<
        string,
        { name: string; count: number; totalProgress: number; tasks: any[] }
      >();
      active.forEach((order) => {
        const key = order.assigned_to || "unassigned";
        const name = order.assignee?.full_name || order.assignee?.email || "Sem responsável";
        const item = workload.get(key) || {
          name,
          count: 0,
          totalProgress: 0,
          tasks: [] as any[],
        };
        item.count += 1;
        item.totalProgress += Number(order.progress) || 0;
        item.tasks.push(order);
        workload.set(key, item);
      });

      return {
        orders,
        active,
        overdue,
        stale,
        unassigned,
        ready,
        monthRevenue,
        receivable,
        todayEntries,
        workload: [...workload.values()].sort((a, b) => b.count - a.count),
        updates: (updatesResult.data ?? []) as any[],
      };
    },
  });

  const statusData = useMemo(() => {
    const totals = new Map<string, number>();
    (data?.active ?? []).forEach((order) => {
      totals.set(order.production_status, (totals.get(order.production_status) ?? 0) + 1);
    });
    return [...totals.entries()].map(([status, value]) => ({
      status,
      name: PRODUCTION_STATUS_LABEL[status] || status,
      value,
      color: STATUS_COLORS[status] || "#64748b",
    }));
  }, [data?.active]);

  const weeklyData = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const day = date.toISOString().slice(0, 10);
      const created = (data?.orders ?? []).filter(
        (order) => order.created_at?.slice(0, 10) === day,
      ).length;
      const moved = (data?.orders ?? []).filter(
        (order) => order.updated_at?.slice(0, 10) === day,
      ).length;
      return {
        day: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        abertas: created,
        movimentadas: moved,
      };
    });
  }, [data?.orders]);

  const attentionOrders = useMemo(
    () =>
      [...(data?.overdue ?? []), ...(data?.stale ?? []), ...(data?.unassigned ?? [])]
        .filter((order, index, rows) => rows.findIndex((item) => item.id === order.id) === index)
        .slice(0, 6),
    [data?.overdue, data?.stale, data?.unassigned],
  );

  const averageProgress = data?.active.length
    ? Math.round(
        data.active.reduce((total, order) => total + (Number(order.progress) || 0), 0) /
          data.active.length,
      )
    : 0;

  const metrics = [
    {
      label: "Ordens ativas",
      value: data?.active.length ?? 0,
      helper: `${averageProgress}% de progresso médio`,
      icon: Clock3,
      gradient: "from-[#12264d] to-[#315b9b]",
    },
    {
      label: "Produção em alerta",
      value: (data?.overdue.length ?? 0) + (data?.stale.length ?? 0),
      helper: "prazos ou atualizações pendentes",
      icon: AlertTriangle,
      gradient: "from-[#8c3142] to-[#d25f62]",
    },
    {
      label: "Prontas para entrega",
      value: data?.ready.length ?? 0,
      helper: "serviços finalizados",
      icon: CheckCircle2,
      gradient: "from-[#064934] to-[#159269]",
    },
    {
      label: "Faturamento no mês",
      value: brl(data?.monthRevenue ?? 0),
      helper: `${brl(data?.todayEntries ?? 0)} recebido hoje`,
      icon: TrendingUp,
      gradient: "from-[#a16d08] to-[#e4b52e]",
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      <section className="relative overflow-hidden rounded-3xl bg-[#071d19] px-5 py-6 text-white shadow-xl md:px-7">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#d7a52d]/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-36 w-64 rounded-full bg-[#159269]/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#f1d67c]">
              <CalendarDays className="h-4 w-4" />
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Painel de produção</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/65">
              Acompanhe a operação da Alcateia's, distribua trabalhos e identifique atrasos antes
              que afetem o cliente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link to="/production">Abrir produção</Link>
            </Button>
            <Button
              className="bg-[#e4b52e] text-[#10241e] shadow-lg hover:bg-[#f1c94e]"
              onClick={() => setNewOrderOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Nova ordem de serviço
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.label}
              className={`overflow-hidden border-0 bg-gradient-to-br ${metric.gradient} p-0 text-white shadow-lg`}
            >
              <div className="relative p-5">
                <div className="absolute -right-6 -top-7 h-24 w-24 rounded-full border-[18px] border-white/10" />
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-white/70">{metric.label}</p>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold tracking-tight">{metric.value}</p>
                <p className="mt-1 text-[11px] text-white/65">{metric.helper}</p>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_.75fr]">
        <Card className="overflow-hidden border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Movimento da produção</h2>
              <p className="text-xs text-muted-foreground">
                Ordens abertas e movimentadas nos últimos 7 dias
              </p>
            </div>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              Atualizado agora
            </Badge>
          </div>
          <div className="h-[285px] px-2 pb-3 pt-5 md:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="productionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#159269" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#159269" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="movimentadas"
                  name="Movimentadas"
                  stroke="#159269"
                  strokeWidth={3}
                  fill="url(#productionFill)"
                />
                <Area
                  type="monotone"
                  dataKey="abertas"
                  name="Novas OS"
                  stroke="#d7a52d"
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="overflow-hidden border-slate-200/80 shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold text-slate-900">Distribuição das etapas</h2>
            <p className="text-xs text-muted-foreground">Onde as ordens ativas estão agora</p>
          </div>
          <div className="grid min-h-[285px] grid-cols-[1fr_1.15fr] items-center gap-1 p-4">
            <div className="relative h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    innerRadius={48}
                    outerRadius={70}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                <strong className="text-2xl text-slate-900">{data?.active.length ?? 0}</strong>
                <span className="text-[10px] text-muted-foreground">OS ativas</span>
              </div>
            </div>
            <div className="space-y-2">
              {statusData.slice(0, 6).map((item) => (
                <div key={item.status} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: item.color }}
                    />
                    <span className="truncate">{item.name}</span>
                  </span>
                  <strong className="text-slate-800">{item.value}</strong>
                </div>
              ))}
              {!statusData.length && (
                <p className="text-xs text-muted-foreground">Nenhuma OS ativa.</p>
              )}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_.85fr]">
        <Card className="overflow-hidden border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Equipe em atividade</h2>
              <p className="text-xs text-muted-foreground">
                Quem está trabalhando e em quais serviços
              </p>
            </div>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/production">
                Ver quadro <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {(data?.workload ?? []).slice(0, 6).map((person) => {
              const average = person.count ? Math.round(person.totalProgress / person.count) : 0;
              return (
                <div
                  key={person.name}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0b4a3a] font-bold text-white">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {person.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {person.count} tarefas em andamento
                        </p>
                      </div>
                    </div>
                    <strong className="text-sm text-[#0b4a3a]">{average}%</strong>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0b4a3a] to-[#d7a52d]"
                      style={{ width: `${average}%` }}
                    />
                  </div>
                  <p className="mt-3 truncate text-xs text-slate-600">
                    {person.tasks[0]?.current_activity ||
                      person.tasks[0]?.title ||
                      "Aguardando atualização"}
                  </p>
                </div>
              );
            })}
            {!data?.workload.length && (
              <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
                Nenhuma tarefa em andamento.
              </div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden border-slate-200/80 shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold text-slate-900">Resumo financeiro</h2>
            <p className="text-xs text-muted-foreground">Recebimentos e valores pendentes</p>
          </div>
          <div className="p-5">
            <div className="mb-5 rounded-2xl bg-gradient-to-br from-[#10264b] to-[#174b44] p-4 text-white">
              <div className="flex items-center justify-between text-xs text-white/65">
                <span>Faturamento mensal</span>
                <Wallet className="h-4 w-4" />
              </div>
              <p className="mt-2 text-2xl font-bold">{brl(data?.monthRevenue ?? 0)}</p>
              <p className="mt-1 text-[11px] text-emerald-200">
                {brl(data?.todayEntries ?? 0)} entrou hoje
              </p>
            </div>
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Contas a receber</p>
                <p className="text-xl font-bold text-slate-900">{brl(data?.receivable ?? 0)}</p>
              </div>
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pendente</Badge>
            </div>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "#94a3b8" }}
                  />
                  <Bar
                    dataKey="movimentadas"
                    fill="#0f7052"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <Card className="overflow-hidden border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Ordens que exigem atenção</h2>
              <p className="text-xs text-muted-foreground">
                Atrasos, falta de responsável ou de atualização
              </p>
            </div>
            <Badge variant="destructive">{attentionOrders.length}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Ordem / cliente</th>
                  <th className="px-4 py-3 font-medium">Responsável</th>
                  <th className="px-4 py-3 font-medium">Etapa</th>
                  <th className="px-5 py-3 text-right font-medium">Prazo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attentionOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">OS #{order.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.clients?.name || order.title}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {order.assignee?.full_name || order.assignee?.email || "Não definido"}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="font-normal">
                        {PRODUCTION_STATUS_LABEL[order.production_status] ||
                          order.production_status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs font-medium text-rose-600">
                      {order.deadline ? fmtDate(order.deadline) : "Sem prazo"}
                    </td>
                  </tr>
                ))}
                {!attentionOrders.length && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-sm text-muted-foreground"
                    >
                      Tudo sob controle por aqui.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="overflow-hidden border-slate-200/80 shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold text-slate-900">Atividade recente</h2>
            <p className="text-xs text-muted-foreground">Atualizações enviadas pela equipe</p>
          </div>
          <div className="max-h-[365px] space-y-0 overflow-y-auto p-5">
            {(data?.updates ?? []).map((update, index) => (
              <div key={update.id} className="relative flex gap-3 pb-5 last:pb-0">
                {index < (data?.updates.length ?? 0) - 1 && (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-px bg-slate-200" />
                )}
                <div className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {update.activity}
                    </p>
                    <strong className="text-xs text-[#0b4a3a]">{update.progress}%</strong>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    OS #{update.orders?.number} · {update.author?.full_name || update.author?.email}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {new Date(update.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
            {!data?.updates.length && (
              <div className="py-8 text-center">
                <UserRound className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <p className="text-sm text-muted-foreground">As atualizações aparecerão aqui.</p>
              </div>
            )}
          </div>
        </Card>
      </section>

      <OrderEditor
        open={newOrderOpen}
        onOpenChange={setNewOrderOpen}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["dashboard"] });
          qc.invalidateQueries({ queryKey: ["orders"] });
          qc.invalidateQueries({ queryKey: ["production-board"] });
        }}
      />
    </div>
  );
}
