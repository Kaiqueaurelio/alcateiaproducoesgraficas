// Shared utility tokens for storefront components. Keep all visual values
// driven by CSS variables defined in src/styles.css so the admin theme
// stays untouched.

export const STORE_CATEGORIES = [
  { slug: "todos", label: "Todos os produtos" },
  { slug: "Cartões", label: "Cartões de visita" },
  { slug: "Panfletos", label: "Panfletos" },
  { slug: "Adesivos", label: "Adesivos" },
  { slug: "Canecas", label: "Canecas" },
  { slug: "Camisetas", label: "Camisetas" },
  { slug: "Brindes", label: "Brindes" },
  { slug: "Banners", label: "Banners" },
  { slug: "Embalagens", label: "Embalagens" },
  { slug: "Plotagem", label: "Plotagem" },
] as const;

export const WHATSAPP_NUMBER = "5511972235342";

export const STORE_CONTACT = {
  phone: "+55 11 97223-5342",
  whatsapp: WHATSAPP_NUMBER,
  email: "contato@alcateias.com.br",
  address: "Estrada do Cabreúva, 703 — Vila Santa Lúcia",
  city: "Carapicuíba — SP, CEP 06321-001",
  hours: [
    { day: "Segunda a Sexta", time: "09:00 – 18:00" },
    { day: "Sábado", time: "09:00 – 13:00" },
    { day: "Domingo", time: "Fechado" },
  ],
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Estrada+do+Cabre%C3%BAva+703+Vila+Santa+L%C3%BAcia+Carapicu%C3%ADba+SP",
};

export function waLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function brl(value: number | string | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}