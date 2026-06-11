import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { Card } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const monthStart = new Date(); monthStart.setDate(1);
      const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 6);
      const [
        cashAll, cashToday, ordersAll, recAll,
      ] = await Promise.all([
        supabase.from("cash_entries").select("type,amount,entry_date"),
        supabase.from("cash_entries").select("type,amount").eq("entry_date", today),
        supabase.from("orders").select("production_status,total,paid,deadline,created_at"),
        supabase.from("receivables").select("amount,status,due_date"),
      ]);
      const cash = cashAll.data ?? [];
      const todayE = cashToday.data ?? [];
      const orders = ordersAll.data ?? [];
      const rec = recAll.data ?? [];
      const balance = cash.reduce((s, e) => s + (e.type === "entrada" ? +e.amount : -+e.amount), 0);
      const inToday = todayE.filter((e) => e.type === "entrada").reduce((s, e) => s + +e.amount, 0);
      const outToday = todayE.filter((e) => e.type === "saida").reduce((s, e) => s + +e.amount, 0);
      const monthRevenue = cash
        .filter((e) => e.type === "entrada" && new Date(e.entry_date) >= monthStart)
        .reduce((s, e) => s + +e.amount, 0);
      const receivable = rec.filter((r) => r.status === "pendente").reduce((s, r) => s + +r.amount, 0);
      const paid = rec.filter((r) => r.status === "pago").reduce((s, r) => s + +r.amount, 0);
      const inProgress = orders.filter((o) => ["em_producao", "arte_em_criacao", "aprovado"].includes(o.production_status)).length;
      const overdue = orders.filter((o) => o.deadline && new Date(o.deadline) < new Date() && o.production_status !== "entregue").length;
      const waitingArt = orders.filter((o) => o.production_status === "aguardando_arte").length;
      const ready = orders.filter((o) => o.production_status === "pronto_para_retirada").length;

      // 7-day revenue
      const days: { day: string; total: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const total = cash
          .filter((e) => e.type === "entrada" && e.entry_date === key)
          .reduce((s, e) => s + +e.amount, 0);
        days.push({ day: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), total });
      }
      // status pie
      const statusCounts: Record<string, number> = {};
      orders.forEach((o) => { statusCounts[o.production_status] = (statusCounts[o.production_status] ?? 0) + 1; });
      const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
      return { balance, inToday, outToday, monthRevenue, receivable, paid, inProgress, overdue, waitingArt, ready, days, pieData };
    },
  });

  const cards = [
    { label: "Saldo atual", value: brl(data?.balance ?? 0), accent: true },
    { label: "Entradas do dia", value: brl(data?.inToday ?? 0) },
    { label: "Saídas do dia", value: brl(data?.outToday ?? 0) },
    { label: "Faturamento do mês", value: brl(data?.monthRevenue ?? 0) },
    { label: "A receber", value: brl(data?.receivable ?? 0) },
    { label: "Recebidas", value: brl(data?.paid ?? 0) },
    { label: "OS em andamento", value: data?.inProgress ?? 0 },
    { label: "OS atrasadas", value: data?.overdue ?? 0 },
    { label: "Aguardando arte", value: data?.waitingArt ?? 0 },
    { label: "Prontas p/ retirada", value: data?.ready ?? 0 },
  ];

  const COLORS = ["#22264a", "#caa451", "#3b6ea8", "#a85a2a", "#5a3aa8"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className={`p-4 ${c.accent ? "bg-primary text-primary-foreground" : ""}`}>
            <div className={`text-xs ${c.accent ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{c.label}</div>
            <div className={`text-xl font-bold mt-1 ${c.accent ? "text-gold" : "text-primary"}`}>{c.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-semibold text-primary mb-3">Faturamento - últimos 7 dias</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.days ?? []}>
              <XAxis dataKey="day" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v: number) => brl(v)} />
              <Bar dataKey="total" fill="oklch(0.26 0.07 258)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold text-primary mb-3">Status das ordens de serviço</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={data?.pieData ?? []} dataKey="value" nameKey="name" outerRadius={90} label>
                {(data?.pieData ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}