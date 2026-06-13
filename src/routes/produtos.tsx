import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell } from "@/components/storefront/StoreShell";
import {
  ProductCard,
  ProductCardSkeleton,
  ProductGrid,
  SectionHeader,
  type StoreProduct,
} from "@/components/storefront/ProductCard";
import { STORE_CATEGORIES } from "@/components/storefront/tokens";

type Search = { cat?: string; q?: string };

export const Route = createFileRoute("/produtos")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    cat: typeof search.cat === "string" ? search.cat : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Catálogo de produtos personalizados — Alcateia's" },
      {
        name: "description",
        content:
          "Catálogo completo de cartões, canecas, camisetas, banners, adesivos, brindes e mais. Personalize do seu jeito.",
      },
      { property: "og:title", content: "Catálogo de produtos — Alcateia's" },
    ],
  }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const search = useSearch({ from: "/produtos" });
  const [text, setText] = useState(search.q ?? "");
  const cat = search.cat ?? "todos";

  const { data, isLoading } = useQuery({
    queryKey: ["store-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(
          "id,name,slug,category,short_description,base_price,image_url,rating,reviews_count,min_quantity,badge,specs,unit",
        )
        .eq("active", true)
        .order("reviews_count", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StoreProduct[];
    },
  });

  const filtered = useMemo(() => {
    const list = data ?? [];
    const term = text.trim().toLowerCase();
    return list.filter((p) => {
      const catOk = cat === "todos" || p.category === cat;
      const termOk =
        !term ||
        `${p.name} ${p.category ?? ""} ${p.short_description ?? ""}`
          .toLowerCase()
          .includes(term);
      return catOk && termOk;
    });
  }, [data, cat, text]);

  return (
    <StoreShell>
      <section className="mx-auto max-w-[1280px] px-4 py-8 sm:py-12">
        <SectionHeader
          kicker="Catálogo"
          title={cat === "todos" ? "Todos os produtos" : cat}
          description="Personalize seu produto e receba o orçamento em minutos."
        />

        <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--store-text-light)]" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Buscar no catálogo..."
              className="h-11 w-full rounded-[var(--store-radius-md)] border border-[var(--store-border)] bg-white pl-11 pr-4 text-sm outline-none focus:border-[var(--store-primary-light)] focus:ring-4 focus:ring-[var(--store-primary-light)]/15"
            />
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STORE_CATEGORIES.map((c) => {
            const active = (cat ?? "todos") === c.slug;
            return (
              <Link
                key={c.slug}
                to="/produtos"
                search={{ cat: c.slug, q: text || undefined }}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "border-[var(--store-primary)] bg-[var(--store-primary)] text-white"
                    : "border-[var(--store-border)] bg-white text-[var(--store-text-muted)] hover:border-[var(--store-primary-light)]/40 hover:text-[var(--store-primary)]"
                }`}
              >
                {c.label}
              </Link>
            );
          })}
        </div>

        {isLoading ? (
          <ProductGrid>
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </ProductGrid>
        ) : filtered.length ? (
          <ProductGrid>
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ProductGrid>
        ) : (
          <div className="rounded-[var(--store-radius-lg)] border border-dashed border-[var(--store-border)] bg-white p-12 text-center">
            <p className="text-base font-bold text-[var(--store-text)]">
              Nenhum produto encontrado
            </p>
            <p className="mt-1 text-sm text-[var(--store-text-muted)]">
              Tente outra categoria ou ajuste a busca.
            </p>
          </div>
        )}
      </section>
    </StoreShell>
  );
}