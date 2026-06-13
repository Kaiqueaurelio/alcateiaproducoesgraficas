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

export const WHATSAPP_NUMBER = "5500000000000";

export function waLink(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function brl(value: number | string | null | undefined) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}