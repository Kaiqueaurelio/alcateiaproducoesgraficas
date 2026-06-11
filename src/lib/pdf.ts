import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { brl, fmtDate } from "./format";

interface Company {
  name: string;
  whatsapp?: string | null;
  instagram?: string | null;
  address?: string | null;
  document?: string | null;
  logo_url?: string | null;
}

interface Item {
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

function header(doc: jsPDF, company: Company, title: string) {
  doc.setFillColor(34, 38, 70);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 215, 130);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(company.name, 14, 14);
  doc.setTextColor(245, 245, 245);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    [company.address, company.whatsapp, company.instagram].filter(Boolean).join("  •  "),
    14, 22,
  );
  doc.setTextColor(34, 38, 70);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 14, 40);
}

function footer(doc: jsPDF) {
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(200);
  doc.line(14, h - 14, 196, h - 14);
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, h - 8);
}

export function generateOrderPDF(opts: {
  company: Company;
  order: {
    number: number; created_at: string; deadline?: string | null;
    description?: string | null; client_notes?: string | null;
    total: number; paid: number; payment_method?: string | null;
    production_status: string; urgent?: boolean;
  };
  client: { name: string; document?: string | null; whatsapp?: string | null; email?: string | null };
  items: Item[];
}) {
  const doc = new jsPDF();
  header(doc, opts.company, `Ordem de Serviço #${opts.order.number}`);

  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50);
  doc.text(`Data: ${fmtDate(opts.order.created_at)}`, 14, 48);
  doc.text(`Prazo: ${fmtDate(opts.order.deadline)}`, 80, 48);
  if (opts.order.urgent) {
    doc.setTextColor(200, 30, 30); doc.setFont("helvetica", "bold");
    doc.text("URGENTE", 160, 48);
    doc.setTextColor(50); doc.setFont("helvetica", "normal");
  }

  doc.setFont("helvetica", "bold"); doc.text("Cliente", 14, 58);
  doc.setFont("helvetica", "normal");
  doc.text(opts.client.name, 14, 64);
  doc.text(
    [opts.client.document, opts.client.whatsapp, opts.client.email].filter(Boolean).join("  •  "),
    14, 70,
  );

  autoTable(doc, {
    startY: 78,
    head: [["Descrição", "Qtd", "Unit.", "Subtotal"]],
    body: opts.items.map((i) => [i.description, String(i.quantity), brl(i.unit_price), brl(i.subtotal)]),
    headStyles: { fillColor: [34, 38, 70], textColor: 255 },
    styles: { fontSize: 9 },
  });

  const y = (doc as any).lastAutoTable.finalY + 8;
  const remaining = (opts.order.total || 0) - (opts.order.paid || 0);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${brl(opts.order.total)}`, 140, y);
  doc.text(`Pago: ${brl(opts.order.paid)}`, 140, y + 6);
  doc.text(`Restante: ${brl(remaining)}`, 140, y + 12);
  doc.setFont("helvetica", "normal");
  if (opts.order.payment_method) doc.text(`Pagamento: ${opts.order.payment_method}`, 14, y);

  if (opts.order.description) {
    doc.setFont("helvetica", "bold"); doc.text("Detalhes", 14, y + 24);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(opts.order.description, 180), 14, y + 30);
  }

  doc.line(14, 260, 90, 260); doc.text("Assinatura cliente", 14, 266);
  doc.line(110, 260, 196, 260); doc.text("Assinatura responsável", 110, 266);

  footer(doc);
  doc.save(`OS-${opts.order.number}.pdf`);
}

export function generateQuotePDF(opts: {
  company: Company;
  quote: { number: number; created_at: string; validity_date?: string | null; total: number; notes?: string | null; discount: number };
  client: { name: string; document?: string | null; whatsapp?: string | null; email?: string | null };
  items: Item[];
}) {
  const doc = new jsPDF();
  header(doc, opts.company, `Orçamento #${opts.quote.number}`);
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50);
  doc.text(`Data: ${fmtDate(opts.quote.created_at)}`, 14, 48);
  doc.text(`Validade: ${fmtDate(opts.quote.validity_date)}`, 80, 48);

  doc.setFont("helvetica", "bold"); doc.text("Cliente", 14, 58);
  doc.setFont("helvetica", "normal");
  doc.text(opts.client.name, 14, 64);
  doc.text(
    [opts.client.document, opts.client.whatsapp, opts.client.email].filter(Boolean).join("  •  "),
    14, 70,
  );

  autoTable(doc, {
    startY: 78,
    head: [["Descrição", "Qtd", "Unit.", "Subtotal"]],
    body: opts.items.map((i) => [i.description, String(i.quantity), brl(i.unit_price), brl(i.subtotal)]),
    headStyles: { fillColor: [34, 38, 70], textColor: 255 },
    styles: { fontSize: 9 },
  });
  const y = (doc as any).lastAutoTable.finalY + 8;
  if (opts.quote.discount > 0) doc.text(`Desconto: ${brl(opts.quote.discount)}`, 140, y);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${brl(opts.quote.total)}`, 140, y + 6);

  if (opts.quote.notes) {
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(opts.quote.notes, 180), 14, y + 20);
  }

  doc.setFont("helvetica", "italic"); doc.setTextColor(80);
  doc.text("Para aprovar este orçamento, responda este e-mail ou entre em contato pelo WhatsApp.", 14, 250);
  footer(doc);
  doc.save(`Orcamento-${opts.quote.number}.pdf`);
}