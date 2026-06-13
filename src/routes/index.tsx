import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronRight, Sparkles, Upload, Send, PackageCheck } from "lucide-react";
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
import { STORE_CATEGORIES, waLink } from "@/components/storefront/tokens";

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
