import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ChevronRight,
  Sparkles,
  Upload,
  Send,
  PackageCheck,
  ShieldCheck,
  Lock,
  Server,
  Cloud,
  FileText,
  Palette,
  Bot,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell } from "@/components/storefront/StoreShell";
import { Hero } from "@/components/storefront/Hero";
import {
  ProductCard,
  ProductCardSkeleton,
  ProductGrid,
  SectionHeader,
  type StoreProduct,
} from "@/components/storefront/ProductCard";
import { STORE_CATEGORIES, STORE_CONTACT, waLink } from "@/components/storefront/tokens";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alcateia's — Gráfica online com produtos personalizados" },
      {
        name: "description",
        content:
          "Cartões de visita, canecas, camisetas, adesivos, banners e brindes personalizados com acabamento profissional. Peça pelo site ou WhatsApp.",
      },
      { property: "og:title", content: "Alcateia's — Gráfica online" },
      {
        property: "og:description",
        content:
          "Produtos personalizados com acabamento profissional. Peça pelo site ou WhatsApp.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <StoreShell>
      <Hero />
      <FeaturedSection />
      <CategoriesSection />
      <HowItWorks />
      <ArtTipsSection />
      <TechSecuritySection />
      <ContactSection />
    </StoreShell>
  );
}

function useStoreProducts() {
  return useQuery({
    queryKey: ["store-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(
          "id,name,slug,category,short_description,base_price,image_url,rating,reviews_count,min_quantity,badge,specs,unit",
        )
        .eq("active", true)
        .order("reviews_count", { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as StoreProduct[];
    },
  });
}

function FeaturedSection() {
  const { data, isLoading } = useStoreProducts();
  const featured = (data ?? []).slice(0, 8);
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12 sm:py-16">
      <SectionHeader
        kicker="Favoritos dos clientes"
        title="Mais pedidos da gráfica"
        description="Produtos com excelente avaliação e prazo de produção rápido."
        action={
          <Link
            to="/produtos"
            className="inline-flex items-center gap-1 text-sm font-bold text-[var(--store-primary)] hover:text-[var(--store-primary-light)]"
          >
            Ver tudo <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />
      <ProductGrid>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : featured.map((p) => <ProductCard key={p.id} product={p} />)}
      </ProductGrid>
    </section>
  );
}

function CategoriesSection() {
  return (
    <section className="bg-[var(--store-surface)] py-12 sm:py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <SectionHeader
          kicker="Serviços gráficos"
          title="Para todos os tipos de marca"
          description="Escolha uma categoria e personalize seu produto em poucos minutos."
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {STORE_CATEGORIES.slice(1).map((c) => (
            <Link
              key={c.slug}
              to="/produtos"
              search={{ cat: c.slug }}
              className="group flex flex-col justify-between rounded-[var(--store-radius-lg)] border border-[var(--store-border)] bg-white p-5 shadow-[var(--store-shadow-sm)] transition-all hover:-translate-y-1 hover:border-[var(--store-primary-light)]/40 hover:shadow-[var(--store-shadow-md)]"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--store-primary)] text-white transition-colors group-hover:bg-[var(--store-accent)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="mt-5">
                <p className="text-base font-extrabold text-[var(--store-text)]">{c.label}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[var(--store-primary)]">
                  Ver produtos <ChevronRight className="h-3.5 w-3.5" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Sparkles, title: "Escolha o produto", desc: "Navegue pelo catálogo e selecione a opção ideal." },
    { icon: Upload, title: "Envie sua arte", desc: "Anexe o arquivo ou peça para nossa equipe criar." },
    { icon: Send, title: "Aprovação rápida", desc: "Confirmamos detalhes e prazos pelo WhatsApp." },
    { icon: PackageCheck, title: "Produção e entrega", desc: "Retirada na loja ou entrega no endereço." },
  ];
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12 sm:py-16">
      <SectionHeader
        kicker="Como funciona"
        title="Do briefing à entrega em poucos passos"
      />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, idx) => (
          <li
            key={s.title}
            className="rounded-[var(--store-radius-lg)] border border-[var(--store-border)] bg-white p-5 shadow-[var(--store-shadow-sm)]"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--store-primary)] text-sm font-extrabold text-white">
                {idx + 1}
              </span>
              <s.icon className="h-5 w-5 text-[var(--store-accent)]" />
            </div>
            <p className="mt-4 text-base font-extrabold text-[var(--store-text)]">{s.title}</p>
            <p className="mt-1 text-sm text-[var(--store-text-muted)]">{s.desc}</p>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-[var(--store-text-muted)]">
          Tem dúvida sobre qual produto escolher?
        </p>
        <a
          href={waLink("Olá! Preciso de ajuda para escolher um produto.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--store-radius-md)] bg-[var(--store-success)] px-5 text-sm font-bold text-white shadow-[var(--store-shadow-md)] hover:brightness-110"
        >
          Falar com a equipe no WhatsApp
        </a>
      </div>
    </section>
  );
}

function ArtTipsSection() {
  const tips = [
    {
      icon: FileText,
      title: "PDF editável é o ideal",
      desc: "Envie em PDF/X-1a ou PDF com fontes incorporadas. Mantém qualidade, cores e textos nítidos na impressão.",
    },
    {
      icon: ImageIcon,
      title: "300 DPI no tamanho final",
      desc: "Para imagens, use 300 DPI em CMYK. Evite imagens baixadas da internet ou prints de tela — saem borradas.",
    },
    {
      icon: Palette,
      title: "Cores em CMYK + sangria de 3mm",
      desc: "Trabalhe em CMYK (não RGB) e deixe 3mm de sangria além do corte para evitar bordas brancas.",
    },
    {
      icon: Bot,
      title: "Arte feita por IA? Avise!",
      desc: "Imagens geradas por IA (Midjourney, DALL·E, etc.) costumam ter resolução baixa. Nos avise para tratarmos a arte antes de imprimir.",
    },
    {
      icon: Sparkles,
      title: "Arte feita no Canva? Conta pra gente",
      desc: "No Canva, exporte como “PDF para impressão” com marcas de corte e sangria. Avise no envio para conferirmos antes da produção.",
    },
    {
      icon: AlertTriangle,
      title: "Confira o que NÃO mandar",
      desc: "Evite JPG/PNG comprimido, Word/PowerPoint, fotos de tela e arquivos abaixo de 1 MB. Em caso de dúvida, mande tudo e a gente avalia.",
    },
  ];
  return (
    <section className="bg-[var(--store-surface)] py-12 sm:py-16">
      <div className="mx-auto max-w-[1280px] px-4">
        <SectionHeader
          kicker="Boas práticas"
          title="Como enviar sua arte na melhor qualidade"
          description="Seguindo essas dicas, sua impressão sai impecável e o prazo é ainda mais rápido."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((t) => (
            <div
              key={t.title}
              className="rounded-[var(--store-radius-lg)] border border-[var(--store-border)] bg-white p-5 shadow-[var(--store-shadow-sm)]"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--store-primary)] text-white">
                  <t.icon className="h-5 w-5" />
                </span>
                <p className="text-base font-extrabold text-[var(--store-text)]">{t.title}</p>
              </div>
              <p className="mt-3 text-sm text-[var(--store-text-muted)]">{t.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-[var(--store-radius-lg)] border border-[var(--store-primary)]/15 bg-[var(--store-primary)]/5 p-5 text-sm text-[var(--store-text)]">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--store-success)]" />
            <span>
              <strong>Resumo rápido:</strong> PDF editável · 300 DPI · CMYK · sangria 3mm · avisar
              se for IA ou Canva. Aceitamos PDF, AI, CDR, PSD, SVG, PNG e JPG até 50 MB.
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}

function TechSecuritySection() {
  const items = [
    {
      icon: Lock,
      title: "Login criptografado",
      desc: "Autenticação protegida e senhas com hash seguro. Seu acesso é só seu.",
    },
    {
      icon: ShieldCheck,
      title: "Arquivos privados",
      desc: "Cada pedido tem link único. Suas artes ficam isoladas e só sua equipe enxerga.",
    },
    {
      icon: Server,
      title: "Banco com RLS",
      desc: "Banco de dados com regras linha-a-linha (Row Level Security) — ninguém vê dados de outro cliente.",
    },
    {
      icon: Cloud,
      title: "Infra global",
      desc: "Hospedagem em nuvem com HTTPS, backups e disponibilidade alta. App rápido em qualquer dispositivo.",
    },
  ];
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12 sm:py-16">
      <SectionHeader
        kicker="Tecnologia e segurança"
        title="Um app moderno, rápido e protegido"
        description="Construído com React, TanStack Start e backend gerenciado com criptografia, RLS e HTTPS de ponta a ponta."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => (
          <div
            key={it.title}
            className="rounded-[var(--store-radius-lg)] border border-[var(--store-border)] bg-white p-5 shadow-[var(--store-shadow-sm)]"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--store-success)]/10 text-[var(--store-success)]">
              <it.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-base font-extrabold text-[var(--store-text)]">{it.title}</p>
            <p className="mt-1 text-sm text-[var(--store-text-muted)]">{it.desc}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-[var(--store-text-muted)]">
        {["React 19", "TanStack Start", "TypeScript", "Tailwind CSS", "Supabase", "HTTPS", "PWA"].map(
          (t) => (
            <span
              key={t}
              className="rounded-full border border-[var(--store-border)] bg-white px-3 py-1"
            >
              {t}
            </span>
          ),
        )}
      </div>
    </section>
  );
}

function ContactSection() {
  return (
    <section className="bg-[var(--store-primary-dark)] py-12 text-white sm:py-16">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--store-secondary)]">
            Atendimento
          </p>
          <h2 className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Estamos por perto para tirar sua ideia do papel
          </h2>
          <p className="mt-3 text-white/70">
            Fale com a equipe Alcateia's no WhatsApp, na loja ou por e-mail. Resposta rápida nos
            horários de atendimento.
          </p>
          <a
            href={waLink("Olá! Quero fazer um orçamento.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-[var(--store-radius-md)] bg-[var(--store-success)] px-6 text-sm font-extrabold uppercase tracking-wide text-white shadow-[var(--store-shadow-md)] hover:brightness-110"
          >
            <Send className="h-4 w-4" /> Falar no WhatsApp
          </a>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[var(--store-radius-lg)] bg-white/5 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--store-secondary)]">
              Telefone / WhatsApp
            </p>
            <p className="mt-2 text-lg font-extrabold">{STORE_CONTACT.phone}</p>
          </div>
          <div className="rounded-[var(--store-radius-lg)] bg-white/5 p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--store-secondary)]">
              E-mail
            </p>
            <p className="mt-2 break-all text-base font-semibold">{STORE_CONTACT.email}</p>
          </div>
          <div className="rounded-[var(--store-radius-lg)] bg-white/5 p-5 sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--store-secondary)]">
              Endereço
            </p>
            <a
              href={STORE_CONTACT.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-base font-semibold hover:text-[var(--store-secondary)]"
            >
              {STORE_CONTACT.address}
              <br />
              {STORE_CONTACT.city}
            </a>
          </div>
          <div className="rounded-[var(--store-radius-lg)] bg-white/5 p-5 sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--store-secondary)]">
              Horário de atendimento
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {STORE_CONTACT.hours.map((h) => (
                <li key={h.day} className="flex justify-between gap-3">
                  <span className="text-white/80">{h.day}</span>
                  <span className="font-semibold">{h.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
