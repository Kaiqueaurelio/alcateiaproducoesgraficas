export const brl = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
};

export const fmtDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("pt-BR");
};

export const PRODUCTION_STATUS_LABEL: Record<string, string> = {
  orcamento: "Orçamento",
  aguardando_aprovacao: "Aguardando aprovação",
  aguardando_arte: "Aguardando arte",
  arte_em_criacao: "Arte em criação",
  aguardando_pagamento: "Aguardando pagamento",
  aprovado: "Aprovado",
  em_producao: "Em produção",
  pausado: "Pausado",
  pronto_para_retirada: "Pronto para retirada",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  nao_pago: "Não pago",
  sinal_pago: "Sinal pago",
  pago_parcial: "Pago parcial",
  pago_completo: "Pago completo",
  em_atraso: "Em atraso",
};

export const QUOTE_STATUS_LABEL: Record<string, string> = {
  em_analise: "Em análise",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export const SERVICE_CATEGORIES = [
  "Banners acadêmicos",
  "Banners personalizados",
  "Adesivos",
  "Adesivos para vidro",
  "Cartões de visita",
  "Canecas personalizadas",
  "DTF",
  "Camisetas",
  "Placas",
  "Sinalização",
  "Impressão 3D",
  "Impressões grandes",
  "Personalizados",
  "Outros",
];

export const PAYMENT_METHODS = [
  "Dinheiro", "Pix", "Cartão de débito", "Cartão de crédito",
  "Boleto", "Transferência", "Outro",
];

export const CASH_IN_CATEGORIES = ["Venda de serviço", "Pagamento de OS", "Sinal/Entrada", "Outros"];
export const CASH_OUT_CATEGORIES = [
  "Material","Aluguel","Energia","Internet","Funcionário","Fornecedor",
  "Manutenção","Equipamento","Transporte","Outros",
];