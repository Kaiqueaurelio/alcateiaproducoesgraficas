// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Banknote,
  Calculator,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  ReceiptText,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  WalletCards,
  UserPlus,
  Settings2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/pdv")({ component: PDVPage });

const QUICK_PRODUCTS = [
  {
    id: "quick-card",
    name: "Cartão de Visita",
    category: "Impressão",
    price: 59.9,
    detail: "4x4 cores • Couchê 300g",
    image: "linear-gradient(135deg,#ede9fe,#6d28d9)",
  },
  {
    id: "quick-flyer",
    name: "Panfleto",
    category: "Impressão",
    price: 129.9,
    detail: "15x21cm • Couchê 90g",
    image: "linear-gradient(135deg,#f3f4f6,#7c3aed)",
  },
  {
    id: "quick-banner",
    name: "Banner",
    category: "Banners",
    price: 89.9,
    detail: "60x90cm • Lona 440g",
    image: "linear-gradient(135deg,#ddd6fe,#312e81)",
  },
  {
    id: "quick-mug",
    name: "Caneca Personalizada",
    category: "Canecas",
    price: 49.9,
    detail: "Cerâmica • 325ml",
    image: "linear-gradient(135deg,#fafafa,#a78bfa)",
  },
  {
    id: "quick-shirt",
    name: "Camiseta Personalizada",
    category: "Camisetas",
    price: 59.9,
    detail: "Poliéster • Sublimação",
    image: "linear-gradient(135deg,#fff,#8b5cf6)",
  },
  {
    id: "quick-sticker",
    name: "Adesivo",
    category: "Adesivos",
    price: 8.9,
    detail: "Personalizado • Vinil",
    image: "linear-gradient(135deg,#fef3c7,#6d28d9)",
  },
];

const CATEGORIES = [
  "Todos",
  "Impressão",
  "Canecas",
  "Camisetas",
  "Adesivos",
  "Banners",
  "Cartões",
  "Outros",
];
const PAYMENT_OPTIONS = [
  { id: "PIX QR Code", label: "PIX QR", icon: QrCode },
  { id: "PIX maquininha", label: "PIX máquina", icon: QrCode },
  { id: "Cartão de débito", label: "Débito", icon: CreditCard },
  { id: "Cartão de crédito", label: "Crédito", icon: WalletCards },
  { id: "Dinheiro", label: "Dinheiro", icon: Banknote },
];

const SESSION_KEY = "alcateia_pdv_session";
const MACHINE_PAYMENT_OPTIONS = [
  "Cartão de débito",
  "Cartão de crédito",
  "PIX maquininha",
] as const;
const FAVORITE_TERMS = [
  "impress",
  "banner",
  "adesivo",
  "caneca",
  "camiseta",
  "cart",
  "panfleto",
  "folder",
];

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString(), day: today() };
}

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function PDVPage() {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [cart, setCart] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", whatsapp: "", notes: "" });
  const [saleNote, setSaleNote] = useState("");
  const [saleDate, setSaleDate] = useState(today());
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [orderSearch, setOrderSearch] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showFastSale, setShowFastSale] = useState(false);
  const [showSquareMeter, setShowSquareMeter] = useState(false);
  const [showMachineEntry, setShowMachineEntry] = useState(false);
  const [showOpenCash, setShowOpenCash] = useState(false);
  const [showCloseCash, setShowCloseCash] = useState(false);
  const [fastSale, setFastSale] = useState({ description: "", value: "" });
  const [squareMeter, setSquareMeter] = useState({
    description: "Adesivo personalizado",
    widthCm: "",
    heightCm: "",
    quantity: "1",
    pricePerSquareMeter: "100",
  });
  const [payments, setPayments] = useState([{ method: "PIX QR Code", amount: "" }]);
  const [machineEntry, setMachineEntry] = useState({
    date: today(),
    method: "Cartão de débito",
    amount: "",
    description: "Vendas da maquininha",
    notes: "",
  });
  const [cashSession, setCashSession] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [sessionForm, setSessionForm] = useState({
    operator: "Operador",
    initialAmount: "0",
    informedCash: "0",
    notes: "",
  });

  const { data: services = [] } = useQuery({
    queryKey: ["pdv_services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, base_price, description, image_url, active")
        .eq("active", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["pdv_clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, whatsapp")
        .order("name", { ascending: true })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: openOrders = [] } = useQuery({
    queryKey: ["pdv_open_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, number, title, total, paid, payment_status, client_id, clients(name, whatsapp)",
        )
        .order("created_at", { ascending: false })
        .limit(250);
      if (error) throw error;
      return (data ?? []).filter((order) => Number(order.total) > Number(order.paid));
    },
  });

  const { data: todayEntries = [], error: todayEntriesError } = useQuery({
    queryKey: ["pdv_cash_entries_today"],
    queryFn: async () => {
      const range = todayRange();
      const { data, error } = await supabase
        .from("cash_entries")
        .select("*")
        .or(
          `entry_date.eq.${range.day},and(created_at.gte.${range.start},created_at.lt.${range.end})`,
        )
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const products = useMemo(() => {
    const serviceProducts = services.map((service) => ({
      id: service.id,
      name: service.name,
      category: service.category || "Outros",
      price: Number(service.base_price || 0),
      detail: service.description || service.category || "Serviço gráfico",
      imageUrl: service.image_url,
    }));
    return serviceProducts.length ? serviceProducts : QUICK_PRODUCTS;
  }, [services]);

  const filteredProducts = products.filter((product) => {
    const matchesQuery = `${product.name} ${product.detail}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesCategory = category === "Todos" || product.category === category;
    return matchesQuery && matchesCategory;
  });
  const favoriteProducts = products
    .filter((product) => {
      const text = `${product.name} ${product.category} ${product.detail}`.toLocaleLowerCase(
        "pt-BR",
      );
      return FAVORITE_TERMS.some((term) => text.includes(term));
    })
    .slice(0, 8);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = Math.max(subtotal - discount, 0);
  const paidTotal = payments.reduce((acc, payment) => acc + toNumber(payment.amount), 0);
  const change = paidTotal - total;
  const squareMeterWidth = toNumber(squareMeter.widthCm) / 100;
  const squareMeterHeight = toNumber(squareMeter.heightCm) / 100;
  const squareMeterQuantity = Math.max(0, toNumber(squareMeter.quantity));
  const squareMeterUnitArea = squareMeterWidth * squareMeterHeight;
  const squareMeterTotalArea = squareMeterUnitArea * squareMeterQuantity;
  const squareMeterTotal = squareMeterTotalArea * toNumber(squareMeter.pricePerSquareMeter);
  const selectedOrder = openOrders.find((order) => order.id === selectedOrderId);
  const filteredOrders = openOrders.filter((order) => {
    const term = orderSearch.trim().toLocaleLowerCase("pt-BR");
    return (
      !term ||
      String(order.number).includes(term) ||
      String(order.title ?? "")
        .toLocaleLowerCase("pt-BR")
        .includes(term) ||
      String(order.clients?.name ?? "")
        .toLocaleLowerCase("pt-BR")
        .includes(term)
    );
  });

  const salesToday = todayEntries.filter((entry) => entry.type === "entrada");
  const expensesToday = todayEntries.filter((entry) => entry.type === "saida");
  const totalToday = salesToday.reduce((acc, entry) => acc + Number(entry.amount || 0), 0);
  const expenseTotal = expensesToday.reduce((acc, entry) => acc + Number(entry.amount || 0), 0);
  const dayBalance = totalToday - expenseTotal;
  const paymentTotals = salesToday.reduce(
    (totals, entry) => {
      const method = String(entry.payment_method || "").toLocaleLowerCase("pt-BR");
      const amount = Number(entry.amount || 0);
      if (method.includes("débito") || method.includes("debito")) totals.debit += amount;
      else if (method.includes("crédito") || method.includes("credito")) totals.credit += amount;
      else if (method.includes("pix")) totals.pix += amount;
      else if (method.includes("dinheiro")) totals.cash += amount;
      else totals.other += amount;
      return totals;
    },
    { cash: 0, pix: 0, debit: 0, credit: 0, other: 0 },
  );
  const latestTodayEntries = todayEntries.slice(0, 8);
  function addToCart(product: any) {
    if (selectedOrderId) {
      toast.error("Conclua ou limpe a cobrança da OS antes de adicionar outros itens.");
      return;
    }
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

  function changeQty(productId: string, delta: number) {
    if (selectedOrderId && productId === `order-${selectedOrderId}`) {
      if (delta > 0) return;
      setSelectedOrderId("");
    }
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId ? { ...item, quantity: Math.max(item.quantity + delta, 0) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function clearSale() {
    setCart([]);
    if (selectedOrderId) {
      setClientId("");
      setClientName("");
    }
    setSelectedOrderId("");
    setSaleNote("");
  }

  function addFastSale() {
    if (selectedOrderId) {
      toast.error("Conclua ou limpe a cobrança da OS antes de criar uma venda rápida.");
      return;
    }
    const value = toNumber(fastSale.value);
    if (!fastSale.description.trim() || value <= 0) {
      toast.error("Informe descrição e valor da venda rápida.");
      return;
    }
    addToCart({
      id: `fast-${Date.now()}`,
      name: fastSale.description.trim(),
      category: "Outros",
      price: value,
      detail: "Venda rápida",
    });
    setFastSale({ description: "", value: "" });
    setShowFastSale(false);
    toast.success("Venda rápida adicionada ao carrinho.");
  }

  function addSquareMeterSale() {
    if (selectedOrderId) {
      toast.error("Conclua ou limpe a cobrança da OS antes de calcular outro item.");
      return;
    }
    if (
      !squareMeter.description.trim() ||
      squareMeterWidth <= 0 ||
      squareMeterHeight <= 0 ||
      squareMeterQuantity <= 0 ||
      toNumber(squareMeter.pricePerSquareMeter) <= 0
    ) {
      toast.error("Preencha descrição, medidas, quantidade e preço por m².");
      return;
    }

    addToCart({
      id: `m2-${Date.now()}`,
      name: squareMeter.description.trim(),
      category: "Venda por m²",
      price: squareMeterTotal,
      quantity: 1,
      detail: `${squareMeter.widthCm} x ${squareMeter.heightCm} cm • ${squareMeterQuantity} un. • ${squareMeterTotalArea.toFixed(4).replace(".", ",")} m²`,
    });
    setShowSquareMeter(false);
    toast.success("Cálculo por m² adicionado ao carrinho.");
  }

  function loadOrder(order: any) {
    const remaining = Math.max(0, Number(order.total) - Number(order.paid));
    if (remaining <= 0) return toast.error("Esta OS já está totalmente paga.");
    setSelectedOrderId(order.id);
    setClientId(order.client_id);
    setClientName(order.clients?.name || "");
    setCart([
      {
        id: `order-${order.id}`,
        name: `OS #${order.number} - ${order.title || "Serviço"}`,
        category: "Ordem de Serviço",
        price: remaining,
        quantity: 1,
        detail: `${order.clients?.name || "Cliente"} • saldo pendente`,
      },
    ]);
    setDiscount(0);
    setSaleNote(`Recebimento vinculado à OS #${order.number}`);
    setShowOrderPicker(false);
    toast.success(`OS #${order.number} adicionada ao caixa.`);
  }

  function openCash() {
    const session = {
      operator: sessionForm.operator || "Operador",
      initialAmount: toNumber(sessionForm.initialAmount),
      openedAt: new Date().toISOString(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setCashSession(session);
    setShowOpenCash(false);
    toast.success("Caixa aberto.");
  }

  function closeCash() {
    const informed = toNumber(sessionForm.informedCash);
    const diff = informed - dayBalance;
    localStorage.removeItem(SESSION_KEY);
    setCashSession(null);
    setShowCloseCash(false);
    toast.success(`Caixa do dia fechado. Diferença: ${brl(diff)}.`);
  }

  async function registerMachineEntry() {
    const amount = toNumber(machineEntry.amount);
    if (!machineEntry.date) return toast.error("Informe a data da venda.");
    if (amount <= 0) return toast.error("Informe um valor maior que zero.");
    const { error } = await supabase.from("cash_entries").insert({
      type: "entrada",
      description: machineEntry.description.trim() || "Vendas da maquininha",
      amount,
      entry_date: machineEntry.date,
      payment_method: machineEntry.method,
      category: "Ajuste maquininha",
      notes: machineEntry.notes.trim() || "Lançamento manual de fechamento",
    });
    if (error) return toast.error(error.message);
    setMachineEntry({
      date: today(),
      method: "Cartão de débito",
      amount: "",
      description: "Vendas da maquininha",
      notes: "",
    });
    setShowMachineEntry(false);
    qc.invalidateQueries({ queryKey: ["pdv_cash_entries_today"] });
    qc.invalidateQueries({ queryKey: ["cash_entries"] });
    toast.success("Valor da maquininha registrado no caixa.");
  }

  async function finalizeSale() {
    if (!cart.length) return toast.error("Adicione pelo menos um item.");
    if (total <= 0) return toast.error("O total da venda deve ser maior que zero.");
    if (!saleDate) return toast.error("Informe a data da venda.");
    if (!payments.length || paidTotal < total)
      return toast.error("Pagamento insuficiente para finalizar.");

    const saleDescription = `PDV - ${cart.map((item) => `${item.quantity}x ${item.name}`).join(", ")}`;
    const mainMethod =
      payments.length > 1
        ? `Misto (${payments.map((payment) => `${payment.method}: ${brl(toNumber(payment.amount))}`).join(" + ")})`
        : payments[0].method;

    const receivableId = selectedOrder ? await findReceivableId(selectedOrder.id) : null;
    const { data: cashEntry, error } = await supabase
      .from("cash_entries")
      .insert({
        type: "entrada",
        description: saleDescription,
        amount: total,
        entry_date: saleDate,
        payment_method: mainMethod,
        category: selectedOrder ? "Pagamento de OS" : "Venda PDV",
        client_id: clientId || null,
        order_id: selectedOrder?.id || null,
        receivable_id: receivableId,
        notes: [
          clientName ? `Cliente: ${clientName}` : "",
          saleNote,
          discount ? `Desconto: ${brl(discount)}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    if (selectedOrder) {
      const nextPaid = Math.min(Number(selectedOrder.total), Number(selectedOrder.paid) + total);
      const fullyPaid = nextPaid >= Number(selectedOrder.total);
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          paid: nextPaid,
          payment_method: mainMethod,
          payment_status: fullyPaid ? "pago_completo" : "pago_parcial",
        })
        .eq("id", selectedOrder.id);
      if (orderError) {
        if (cashEntry?.id) await supabase.from("cash_entries").delete().eq("id", cashEntry.id);
        return toast.error(`A cobrança não foi concluída: ${orderError.message}`);
      }

      if (fullyPaid && receivableId) {
        await supabase
          .from("receivables")
          .update({
            status: "pago",
            paid_at: new Date(`${saleDate}T12:00:00`).toISOString(),
            payment_method: mainMethod,
          })
          .eq("id", receivableId);
      }
    }

    setCart([]);
    setDiscount(0);
    setClientName("");
    setClientId("");
    setSaleNote("");
    setSaleDate(today());
    setSelectedOrderId("");
    setPayments([{ method: "PIX QR Code", amount: "" }]);
    setShowCheckout(false);
    qc.invalidateQueries({ queryKey: ["pdv_cash_entries_today"] });
    qc.invalidateQueries({ queryKey: ["cash_entries"] });
    qc.invalidateQueries({ queryKey: ["pdv_open_orders"] });
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["receivables"] });
    toast.success("Venda finalizada e registrada no caixa.");
  }

  async function createClient() {
    if (!newClient.name.trim()) return toast.error("Informe o nome do cliente.");
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name: newClient.name.trim(),
        whatsapp: newClient.whatsapp.trim() || null,
        notes: newClient.notes.trim() || null,
      })
      .select("id, name")
      .single();
    if (error) return toast.error(error.message);
    setClientId(data.id);
    setClientName(data.name);
    setNewClient({ name: "", whatsapp: "", notes: "" });
    setShowNewClient(false);
    qc.invalidateQueries({ queryKey: ["pdv_clients"] });
    toast.success("Cliente cadastrado e selecionado.");
  }

  function setExactPayment(method: string) {
    setPayments([{ method, amount: String(total.toFixed(2)) }]);
  }

  async function findReceivableId(orderId: string) {
    const { data } = await supabase
      .from("receivables")
      .select("id")
      .eq("order_id", orderId)
      .neq("status", "pago")
      .limit(1)
      .maybeSingle();
    return data?.id ?? null;
  }

  return (
    <div className="min-h-[calc(100vh-9rem)] max-w-full overflow-x-hidden rounded-[2rem] bg-[#f8fafc] p-2 text-slate-950 sm:p-3 md:p-4">
      <div className="mb-5 flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brand-blue">
            PDV Mercado Alcateia
          </p>
          <h2 className="text-2xl font-black tracking-tight">Frente de Caixa</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 font-bold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Online
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 font-bold">
            <CalendarDays className="h-4 w-4" /> {new Date().toLocaleDateString("pt-BR")}
          </span>
          {cashSession ? (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setSessionForm((current) => ({
                  ...current,
                  informedCash: dayBalance.toFixed(2),
                }));
                setShowCloseCash(true);
              }}
            >
              Fechar caixa
            </Button>
          ) : (
            <Button
              className="rounded-xl bg-brand-blue hover:bg-brand-blue-light"
              onClick={() => setShowOpenCash(true)}
            >
              Abrir caixa
            </Button>
          )}
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-4 rounded-[1.5rem] bg-brand-blue p-5 text-white shadow-lg shadow-blue-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
            Saldo somente de hoje
          </p>
          <p className="mt-1 text-3xl font-black">{brl(dayBalance)}</p>
          <p className="mt-1 text-sm text-blue-100">
            Entradas menos saídas de {new Date().toLocaleDateString("pt-BR")}.
          </p>
        </div>
        <Button
          className="h-12 w-full rounded-xl bg-white font-black text-brand-blue hover:bg-blue-50 sm:w-auto"
          onClick={() => setShowMachineEntry(true)}
        >
          <ReceiptText className="mr-2 h-5 w-5" /> Lançar maquininha
        </Button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Entradas</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">{brl(totalToday)}</p>
        </Card>
        <Card className="rounded-2xl border-slate-200 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Saídas</p>
          <p className="mt-1 text-2xl font-black text-red-600">{brl(expenseTotal)}</p>
        </Card>
        <Card className="rounded-2xl border-slate-200 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">Cartões</p>
          <p className="mt-1 text-2xl font-black text-brand-blue">
            {brl(paymentTotals.debit + paymentTotals.credit)}
          </p>
        </Card>
        <Card className="rounded-2xl border-slate-200 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">PIX</p>
          <p className="mt-1 text-2xl font-black text-brand-blue">{brl(paymentTotals.pix)}</p>
        </Card>
      </div>

      <Card className="mb-5 overflow-hidden rounded-[1.5rem] border-slate-200 bg-white p-0 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-blue">
              Lançamentos de hoje
            </p>
            <p className="text-sm text-slate-500">Tudo que entra no saldo diário aparece aqui.</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-brand-blue">
            {todayEntries.length} lançamentos
          </span>
        </div>
        <div className="max-h-64 overflow-y-auto p-3">
          {todayEntriesError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              Não consegui carregar os lançamentos do caixa: {todayEntriesError.message}
            </div>
          ) : latestTodayEntries.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {latestTodayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {entry.description || entry.category || "Lançamento"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {entry.payment_method || "Sem forma"} ·{" "}
                        {new Date(entry.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                        entry.type === "saida"
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {entry.type === "saida" ? "Saída" : "Entrada"}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-xl font-black ${
                      entry.type === "saida" ? "text-red-600" : "text-emerald-600"
                    }`}
                  >
                    {entry.type === "saida" ? "-" : "+"}
                    {brl(Number(entry.amount || 0))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Nenhum lançamento encontrado hoje. Finalize uma venda ou use “Lançar maquininha”.
            </div>
          )}
        </div>
      </Card>

      <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 space-y-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(220px,1fr)_repeat(5,auto)]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-14 rounded-2xl border-slate-200 bg-white pl-12 text-base shadow-sm"
                placeholder="Buscar produto, serviço ou código..."
              />
            </div>
            <Button
              className="h-14 rounded-2xl bg-brand-blue px-6 text-base font-black hover:bg-brand-blue-light"
              onClick={() => setShowFastSale(true)}
            >
              <Plus className="mr-2 h-5 w-5" /> Venda Rápida
            </Button>
            <Button
              variant="outline"
              className="h-14 rounded-2xl border-blue-200 bg-blue-50 px-5 font-black text-brand-blue hover:bg-blue-100"
              onClick={() => setShowSquareMeter(true)}
            >
              <Calculator className="mr-2 h-5 w-5" /> Calcular m²
            </Button>
            <Button
              variant="outline"
              className="h-14 rounded-2xl border-blue-200 bg-blue-50 px-5 font-black text-brand-blue hover:bg-blue-100"
              onClick={() => setShowOrderPicker(true)}
            >
              <ClipboardList className="mr-2 h-5 w-5" /> Cobrar OS
            </Button>
            <Button
              variant="outline"
              className="h-14 rounded-2xl bg-white px-5 font-black"
              onClick={() => setShowNewClient(true)}
            >
              <UserPlus className="mr-2 h-5 w-5" /> Cliente
            </Button>
            <Button asChild variant="outline" className="h-14 rounded-2xl bg-white px-5 font-black">
              <a href="/services">
                <Settings2 className="mr-2 h-5 w-5" /> Produtos
              </a>
            </Button>
          </div>

          {favoriteProducts.length > 0 && (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-blue">
                    Mais usados
                  </p>
                  <h3 className="font-black">Atalhos rápidos de venda</h3>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-brand-blue">
                  1 clique
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {favoriteProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="rounded-2xl border border-slate-200 p-3 text-left transition hover:border-brand-blue hover:bg-blue-50"
                  >
                    <p className="line-clamp-1 text-sm font-black">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{product.category}</p>
                    <p className="mt-2 font-black text-brand-blue">{brl(product.price)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="app-scrollbar flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  "whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-black shadow-sm transition",
                  category === item
                    ? "border-brand-blue bg-brand-blue text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-brand-blue/40",
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden rounded-3xl border-slate-200 bg-white p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div
                  className="h-28 bg-slate-100"
                  style={{
                    background: product.imageUrl ? undefined : product.image,
                    backgroundImage: product.imageUrl ? `url(${product.imageUrl})` : product.image,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="space-y-3 p-4">
                  <div>
                    <h3 className="line-clamp-1 font-black">{product.name}</h3>
                    <p className="line-clamp-1 text-xs text-slate-500">{product.detail}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-brand-blue">{brl(product.price)}</span>
                    <Button
                      size="icon"
                      className="rounded-full bg-brand-blue hover:bg-brand-blue-light"
                      onClick={() => addToCart(product)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <aside className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm md:p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">Itens da venda</h2>
            <Button variant="ghost" size="sm" className="text-brand-blue" onClick={clearSale}>
              <Trash2 className="mr-1 h-4 w-4" /> Limpar
            </Button>
          </div>

          <div className="app-scrollbar max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {cart.length ? (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-slate-100 p-2 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:gap-3"
                >
                  <div className="flex items-center justify-center gap-2">
                    <button
                      className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-brand-blue"
                      onClick={() => changeQty(item.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-black">{item.quantity}</span>
                    <button
                      className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-brand-blue"
                      onClick={() => changeQty(item.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-black">{item.name}</p>
                    <p className="truncate text-xs text-slate-500">{item.detail}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between border-t border-slate-100 pt-2 text-right sm:col-span-1 sm:block sm:border-0 sm:pt-0">
                    <p className="font-black">{brl(item.price * item.quantity)}</p>
                    <button
                      className="text-xs text-red-500"
                      onClick={() => changeQty(item.id, -999)}
                    >
                      remover
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="grid place-items-center rounded-3xl border border-dashed border-slate-200 py-16 text-center text-slate-500">
                <ShoppingCart className="mb-3 h-10 w-10 text-slate-300" />
                <p className="font-bold">Carrinho vazio</p>
                <p className="text-sm">Adicione um produto ou use venda rápida.</p>
              </div>
            )}
          </div>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <strong>{brl(subtotal)}</strong>
            </div>
            <div className="grid grid-cols-[1fr_130px] items-center gap-3">
              <Label className="text-sm text-slate-500">Desconto</Label>
              <Input
                value={discount}
                type="number"
                min="0"
                step="0.01"
                onChange={(e) => setDiscount(toNumber(e.target.value))}
                className="h-10 rounded-xl text-right"
              />
            </div>
            <div className="flex items-end justify-between border-t border-slate-100 pt-4">
              <span className="text-lg font-black">Total</span>
              <strong className="text-3xl font-black text-brand-blue">{brl(total)}</strong>
            </div>
            <Button
              disabled={!cart.length}
              className="h-14 w-full rounded-2xl bg-brand-blue text-base font-black hover:bg-brand-blue-light"
              onClick={() => {
                setPayments([{ method: "PIX QR Code", amount: String(total.toFixed(2)) }]);
                setShowCheckout(true);
              }}
            >
              Finalizar venda
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {PAYMENT_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setExactPayment(option.id)}
                  className="rounded-2xl border border-slate-200 bg-white p-3 text-center text-xs font-black text-slate-700 transition hover:border-brand-blue hover:text-brand-blue"
                >
                  <Icon className="mx-auto mb-1 h-5 w-5" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      <Dialog open={showFastSale} onOpenChange={setShowFastSale}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Venda rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Descrição</Label>
              <Input
                value={fastSale.description}
                onChange={(e) => setFastSale({ ...fastSale, description: e.target.value })}
                placeholder="Ex: Impressão A4"
              />
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                autoFocus
                inputMode="decimal"
                value={fastSale.value}
                onChange={(e) => setFastSale({ ...fastSale, value: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-brand-blue hover:bg-brand-blue-light" onClick={addFastSale}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSquareMeter} onOpenChange={setShowSquareMeter}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Calculadora por metro quadrado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Produto ou serviço</Label>
              <Input
                value={squareMeter.description}
                onChange={(event) =>
                  setSquareMeter({ ...squareMeter, description: event.target.value })
                }
                placeholder="Ex: Adesivo personalizado"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>Largura (cm)</Label>
                <Input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={squareMeter.widthCm}
                  onChange={(event) =>
                    setSquareMeter({ ...squareMeter, widthCm: event.target.value })
                  }
                  placeholder="20"
                />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={squareMeter.heightCm}
                  onChange={(event) =>
                    setSquareMeter({ ...squareMeter, heightCm: event.target.value })
                  }
                  placeholder="3"
                />
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1"
                  value={squareMeter.quantity}
                  onChange={(event) =>
                    setSquareMeter({ ...squareMeter, quantity: event.target.value })
                  }
                />
              </div>
              <div>
                <Label>Preço do m²</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={squareMeter.pricePerSquareMeter}
                  onChange={(event) =>
                    setSquareMeter({
                      ...squareMeter,
                      pricePerSquareMeter: event.target.value,
                    })
                  }
                  placeholder="100"
                />
              </div>
            </div>
            <Card className="rounded-3xl border-blue-100 bg-blue-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-blue">
                Cálculo automático
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600">
                {squareMeterWidth.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ×{" "}
                {squareMeterHeight.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ×{" "}
                {squareMeterQuantity.toLocaleString("pt-BR")} ×{" "}
                {brl(toNumber(squareMeter.pricePerSquareMeter))}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Área total</p>
                  <p className="text-xl font-black text-brand-blue">
                    {squareMeterTotalArea.toLocaleString("pt-BR", {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 4,
                    })}{" "}
                    m²
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs text-slate-500">Total calculado</p>
                  <p className="text-2xl font-black text-brand-blue">{brl(squareMeterTotal)}</p>
                </div>
              </div>
            </Card>
            <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
              <p>90 × 100 cm, 1 un., R$ 105/m² = R$ 94,50</p>
              <p>20 × 3 cm, 2 un., R$ 100/m² = R$ 1,20</p>
              <p>50 × 50 cm, 1 un., R$ 105/m² = R$ 26,25</p>
              <p>5 × 5 cm, 100 un., R$ 100/m² = R$ 25,00</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSquareMeter(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-brand-blue hover:bg-brand-blue-light"
              onClick={addSquareMeterSale}
            >
              Adicionar ao carrinho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Finalizar venda</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-3">
              <div>
                <Label>Data da venda *</Label>
                <Input
                  type="date"
                  value={saleDate}
                  max={today()}
                  onChange={(e) => setSaleDate(e.target.value || today())}
                />
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label>Cliente (opcional)</Label>
                  <button
                    type="button"
                    className="text-xs font-bold text-brand-blue"
                    onClick={() => setShowNewClient(true)}
                  >
                    Novo cliente
                  </button>
                </div>
                <Select
                  value={clientId || "sem-cliente"}
                  onValueChange={(value) => {
                    if (value === "sem-cliente") {
                      setClientId("");
                      setClientName("");
                      return;
                    }
                    const client = clients.find((item) => item.id === value);
                    setClientId(value);
                    setClientName(client?.name || "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Consumidor não identificado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sem-cliente">Consumidor não identificado</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observação</Label>
                <Textarea
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                  placeholder="Detalhes da venda"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pagamento</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPayments([...payments, { method: "PIX QR Code", amount: "" }])
                    }
                  >
                    Pagamento misto
                  </Button>
                </div>
                {payments.map((payment, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
                    <Select
                      value={payment.method}
                      onValueChange={(method) =>
                        setPayments(payments.map((p, i) => (i === index ? { ...p, method } : p)))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_OPTIONS.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      inputMode="decimal"
                      value={payment.amount}
                      onChange={(e) =>
                        setPayments(
                          payments.map((p, i) =>
                            i === index ? { ...p, amount: e.target.value } : p,
                          ),
                        )
                      }
                      placeholder="0,00"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setPayments(payments.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Card className="rounded-3xl bg-slate-950 p-4 text-white">
              <p className="text-sm text-white/60">Total da venda</p>
              <p className="text-3xl font-black">{brl(total)}</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Recebido</span>
                  <strong>{brl(paidTotal)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>{change >= 0 ? "Troco" : "Falta"}</span>
                  <strong className={change >= 0 ? "text-emerald-300" : "text-red-300"}>
                    {brl(Math.abs(change))}
                  </strong>
                </div>
              </div>
              <Button
                className="mt-5 w-full rounded-2xl bg-white text-slate-950 hover:bg-white/90"
                onClick={() =>
                  setPayments([{ method: "Dinheiro", amount: String(total.toFixed(2)) }])
                }
              >
                Valor exato
              </Button>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCheckout(false)}>
              Cancelar
            </Button>
            <Button className="bg-brand-blue hover:bg-brand-blue-light" onClick={finalizeSale}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOrderPicker} onOpenChange={setShowOrderPicker}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Cobrar Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
              className="pl-9"
              placeholder="Buscar número da OS, cliente ou serviço..."
            />
          </div>
          <div className="app-scrollbar max-h-[420px] space-y-2 overflow-y-auto">
            {filteredOrders.map((order) => {
              const remaining = Math.max(0, Number(order.total) - Number(order.paid));
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => loadOrder(order)}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-brand-blue hover:bg-blue-50"
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-black uppercase tracking-wide text-brand-blue">
                      OS #{order.number}
                    </span>
                    <span className="block truncate font-black">
                      {order.title || "Ordem de Serviço"}
                    </span>
                    <span className="block truncate text-sm text-slate-500">
                      {order.clients?.name || "Cliente"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs text-slate-500">Saldo</span>
                    <strong className="text-lg text-brand-blue">{brl(remaining)}</strong>
                  </span>
                </button>
              );
            })}
            {!filteredOrders.length && (
              <p className="py-10 text-center text-sm text-slate-500">
                Nenhuma OS pendente encontrada.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMachineEntry} onOpenChange={setShowMachineEntry}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Lançar vendas esquecidas da maquininha</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Use o total mostrado na maquininha para registrar débito, crédito ou PIX que não entrou
            no PDV durante o dia.
          </p>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Data da venda *</Label>
                <Input
                  type="date"
                  max={today()}
                  value={machineEntry.date}
                  onChange={(event) =>
                    setMachineEntry({ ...machineEntry, date: event.target.value })
                  }
                />
              </div>
              <div>
                <Label>Forma de pagamento *</Label>
                <Select
                  value={machineEntry.method}
                  onValueChange={(method) => setMachineEntry({ ...machineEntry, method })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MACHINE_PAYMENT_OPTIONS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Valor total *</Label>
              <Input
                autoFocus
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={machineEntry.amount}
                onChange={(event) =>
                  setMachineEntry({ ...machineEntry, amount: event.target.value })
                }
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={machineEntry.description}
                onChange={(event) =>
                  setMachineEntry({ ...machineEntry, description: event.target.value })
                }
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={machineEntry.notes}
                onChange={(event) =>
                  setMachineEntry({ ...machineEntry, notes: event.target.value })
                }
                placeholder="Ex: total conferido no relatório da máquina"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMachineEntry(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-brand-blue hover:bg-brand-blue-light"
              onClick={registerMachineEntry}
            >
              Registrar no caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Cadastrar cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input
                autoFocus
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input
                inputMode="tel"
                value={newClient.whatsapp}
                onChange={(e) => setNewClient({ ...newClient, whatsapp: e.target.value })}
              />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={newClient.notes}
                onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-brand-blue hover:bg-brand-blue-light" onClick={createClient}>
              Cadastrar e usar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOpenCash} onOpenChange={setShowOpenCash}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Abrir caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Operador</Label>
              <Input
                value={sessionForm.operator}
                onChange={(e) => setSessionForm({ ...sessionForm, operator: e.target.value })}
              />
            </div>
            <div>
              <Label>Valor inicial</Label>
              <Input
                inputMode="decimal"
                value={sessionForm.initialAmount}
                onChange={(e) => setSessionForm({ ...sessionForm, initialAmount: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-brand-blue hover:bg-brand-blue-light" onClick={openCash}>
              Abrir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseCash} onOpenChange={setShowCloseCash}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Fechar caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl bg-brand-blue p-4 text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-200">
                Saldo esperado do dia
              </p>
              <p className="mt-1 text-3xl font-black">{brl(dayBalance)}</p>
              <p className="mt-1 text-xs text-blue-100">
                {brl(totalToday)} em entradas e {brl(expenseTotal)} em saídas.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-slate-100 p-3">
                <span className="block text-xs text-slate-500">Dinheiro</span>
                <strong>{brl(paymentTotals.cash)}</strong>
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <span className="block text-xs text-slate-500">PIX</span>
                <strong>{brl(paymentTotals.pix)}</strong>
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <span className="block text-xs text-slate-500">Débito</span>
                <strong>{brl(paymentTotals.debit)}</strong>
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <span className="block text-xs text-slate-500">Crédito</span>
                <strong>{brl(paymentTotals.credit)}</strong>
              </div>
              {paymentTotals.other > 0 && (
                <div className="col-span-2 rounded-xl bg-slate-100 p-3">
                  <span className="block text-xs text-slate-500">Outros ou mistos</span>
                  <strong>{brl(paymentTotals.other)}</strong>
                </div>
              )}
            </div>
            <div>
              <Label>Saldo total conferido</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={sessionForm.informedCash}
                onChange={(e) => setSessionForm({ ...sessionForm, informedCash: e.target.value })}
              />
            </div>
            <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-brand-blue">
              Diferença: {brl(toNumber(sessionForm.informedCash) - dayBalance)}
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-brand-blue hover:bg-brand-blue-light" onClick={closeCash}>
              Fechar caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
