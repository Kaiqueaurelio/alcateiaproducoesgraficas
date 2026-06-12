export const BRIEFING_ACCEPT = ".png,.jpg,.jpeg,.pdf,.svg,.webp,.cdr,.ai,.psd";

export const BRIEFING_PRODUCTS = ["Caneca", "Camiseta", "Adesivo", "Banner", "Cartão", "Outro"];

export const PRODUCT_FIELDS: Record<
  string,
  { key: string; label: string; placeholder?: string }[]
> = {
  Caneca: [
    { key: "texto", label: "Nome ou frase" },
    { key: "tema", label: "Tema da arte" },
    { key: "cor", label: "Cor preferida" },
    { key: "estilo", label: "Estilo desejado" },
  ],
  Camiseta: [
    { key: "cor", label: "Cor da camiseta" },
    { key: "tamanho", label: "Tamanho" },
    { key: "frente", label: "Estampa da frente" },
    { key: "costas", label: "Estampa das costas" },
    { key: "tipo", label: "Tipo de arte" },
  ],
  Adesivo: [
    { key: "medidas", label: "Medidas" },
    { key: "material", label: "Material desejado" },
    { key: "aplicacao", label: "Local de aplicação" },
    { key: "acabamento", label: "Acabamento" },
  ],
  Banner: [
    { key: "medidas", label: "Medidas" },
    { key: "texto", label: "Texto principal" },
    { key: "cores", label: "Cores desejadas" },
    { key: "acabamento", label: "Acabamento e instalação" },
  ],
  Cartão: [
    { key: "medidas", label: "Formato" },
    { key: "dados", label: "Dados que devem aparecer" },
    { key: "cores", label: "Cores da marca" },
    { key: "acabamento", label: "Acabamento" },
  ],
  Outro: [{ key: "detalhes", label: "Descreva os detalhes do produto" }],
};

export function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export function isAllowedBriefingFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return Boolean(
    extension &&
    ["png", "jpg", "jpeg", "pdf", "svg", "webp", "cdr", "ai", "psd"].includes(extension) &&
    file.size <= 50 * 1024 * 1024,
  );
}

export function isPreviewable(mime?: string | null, name?: string) {
  return Boolean(mime?.startsWith("image/") || name?.toLowerCase().endsWith(".svg"));
}
