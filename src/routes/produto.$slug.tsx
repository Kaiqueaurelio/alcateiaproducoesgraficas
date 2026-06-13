import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ShoppingCart,
  MessageCircle,
  Upload,
  Star,
  Truck,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StoreShell } from "@/components/storefront/StoreShell";
import { brl, waLink } from "@/components/storefront/tokens";
import {
  ProductCard,
  ProductGrid,
  SectionHeader,
  type StoreProduct,
} from "@/components/storefront/ProductCard";

export const Route = createFileRoute("/produto/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Produto ${params.slug} — Alcateia's` },
      {
        name: "description",
        content:
          "Personalize seu produto na Alcateia's: acabamento profissional, prazos rápidos e atendimento humano.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = useParams({ from: "/produto/$slug" });

  const { data: product, isLoading } = useQuery({
    queryKey: ["store-product", slug],
    queryFn: async () => {
      const byCol = await supabase
        .from("services")
        .select("*")
        .or(`slug.eq.${slug},id.eq.${slug}`)
        .eq("active", true)
        .maybeSingle();
      if (byCol.error) throw byCol.error;
      return byCol.data as StoreProduct | null;
    },
  });

  const { data: related } = useQuery({
    queryKey: ["store-related", product?.category],
    enabled: !!product?.category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(
          "id,name,slug,category,short_description,base_price,image_url,rating,reviews_count,min_quantity,badge,specs,unit",
        )
        .eq("active", true)
        .eq("category", product!.category!)
        .neq("id", product!.id)
        .limit(4);
      if (error) throw error;
      return (data ?? []) as StoreProduct[];
    },
  });

  if (isLoading) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-[1280px] px-4 py-12">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="aspect-square animate-pulse rounded-[var(--store-radius-xl)] bg-[var(--store-surface-soft)]" />
            <div className="space-y-4">
              <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--store-surface-soft)]" />
              <div className="h-4 w-full animate-pulse rounded bg-[var(--store-surface-soft)]" />
              <div className="h-12 w-1/3 animate-pulse rounded bg-[var(--store-surface-soft)]" />
            </div>
          </div>
        </div>
      </StoreShell>
    );
  }

  if (!product) {
    return (
      <StoreShell>
        <div className="mx-auto max-w-[1280px] px-4 py-20 text-center">
          <h1 className="text-2xl font-extrabold text-[var(--store-primary)]">
            Produto não encontrado
          </h1>
          <p className="mt-2 text-sm text-[var(--store-text-muted)]">
            O link pode ter mudado. Veja todo o catálogo.
          </p>
          <Link
            to="/produtos"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-[var(--store-radius-md)] bg-[var(--store-primary)] px-5 text-sm font-bold text-white"
          >
            Ver catálogo
          </Link>
        </div>
      </StoreShell>
    );
  }

  return (
    <StoreShell>
      <article className="mx-auto max-w-[1280px] px-4 py-8 sm:py-12">
        <nav className="mb-6 flex items-center gap-2 text-xs text-[var(--store-text-muted)]">
          <Link to="/" className="hover:text-[var(--store-primary)]">
            Início
          </Link>
          <span>/</span>
          <Link
            to="/produtos"
            search={{ cat: product.category ?? "todos" }}
            className="hover:text-[var(--store-primary)]"
          >
            {product.category ?? "Catálogo"}
          </Link>
          <span>/</span>
          <span className="truncate text-[var(--store-text)]">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <Gallery image={product.image_url} alt={product.name} />
          <BuyBox product={product} />
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[var(--store-radius-lg)] border border-[var(--store-border)] bg-white p-6">
            <h2 className="text-lg font-extrabold text-[var(--store-primary)]">
              Sobre este produto
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--store-text-muted)]">
              {product.short_description ||
                "Produto personalizado produzido com acabamento profissional. Entre em contato pelo WhatsApp para tirar dúvidas e finalizar seu pedido."}
            </p>
            {product.specs?.length ? (
              <>
                <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-[var(--store-accent)]">
                  Especificações
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {product.specs.map((s) => (
                    <li
                      key={s}
                      className="flex items-start gap-2 rounded-[var(--store-radius-md)] bg-[var(--store-surface-soft)] px-3 py-2 text-sm text-[var(--store-text)]"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--store-success)]" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <aside className="space-y-3">
            <InfoRow icon={Clock} title="Produção rápida" text="Pronto em até 48h úteis" />
            <InfoRow icon={Truck} title="Entrega ou retirada" text="Combine pelo WhatsApp" />
            <InfoRow icon={ShieldCheck} title="Aprovação garantida" text="Você confirma antes da produção" />
          </aside>
        </div>

        {related && related.length > 0 && (
          <section className="mt-16">
            <SectionHeader kicker="Produtos relacionados" title="Veja também" />
            <ProductGrid>
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </ProductGrid>
          </section>
        )}
      </article>
    </StoreShell>
  );
}

function Gallery({ image, alt }: { image: string | null; alt: string }) {
  return (
    <div className="space-y-3">
      <div className="aspect-square overflow-hidden rounded-[var(--store-radius-xl)] border border-[var(--store-border)] bg-[var(--store-surface-soft)]">
        {image ? (
          <img src={image} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-[var(--store-text-light)]">
            Sem imagem
          </div>
        )}
      </div>
    </div>
  );
}

function BuyBox({ product }: { product: StoreProduct }) {
  const min = product.min_quantity ?? 1;
  const [qty, setQty] = useState(min);
  const [obs, setObs] = useState("");
  const total = (Number(product.base_price) || 0) * qty;
  const rating = product.rating ? Number(product.rating) : null;

  const message = `Olá! Tenho interesse no produto *${product.name}*. Quantidade: ${qty}${obs ? `. Observações: ${obs}` : ""}.`;

  return (
    <section className="space-y-5 rounded-[var(--store-radius-xl)] border border-[var(--store-border)] bg-white p-6 shadow-[var(--store-shadow-sm)]">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--store-accent)]">
          {product.category ?? "Personalizado"}
        </p>
        <h1 className="mt-1 text-2xl font-extrabold leading-tight text-[var(--store-text)] sm:text-3xl">
          {product.name}
        </h1>
        {rating != null && (
          <div className="mt-2 flex items-center gap-1 text-sm text-[var(--store-text-muted)]">
            <Star className="h-4 w-4 fill-[var(--store-secondary)] text-[var(--store-secondary)]" />
            <span className="font-semibold text-[var(--store-text)]">{rating.toFixed(1)}</span>
            <span>· {product.reviews_count ?? 0} avaliações</span>
          </div>
        )}
      </div>

      <div className="rounded-[var(--store-radius-lg)] bg-[var(--store-surface-soft)] p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--store-text-light)]">
          Preço unitário
        </p>
        <p className="text-3xl font-extrabold leading-tight text-[var(--store-primary)]">
          {brl(product.base_price)}
        </p>
        <p className="text-xs text-[var(--store-text-muted)]">
          {product.unit ? `por ${product.unit}` : ""}
          {product.min_quantity ? ` · mínimo ${product.min_quantity}` : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="qty" className="text-xs font-bold uppercase tracking-wide text-[var(--store-text-muted)]">
            Quantidade
          </label>
          <input
            id="qty"
            type="number"
            min={min}
            value={qty}
            onChange={(e) => setQty(Math.max(min, Number(e.target.value) || min))}
            className="mt-1 h-11 w-full rounded-[var(--store-radius-md)] border border-[var(--store-border)] bg-white px-3 text-sm outline-none focus:border-[var(--store-primary-light)] focus:ring-4 focus:ring-[var(--store-primary-light)]/15"
          />
        </div>
        <div className="rounded-[var(--store-radius-md)] border border-dashed border-[var(--store-primary-light)]/40 bg-[var(--store-primary-light)]/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--store-text-muted)]">
            Total estimado
          </p>
          <p className="text-xl font-extrabold text-[var(--store-primary)]">{brl(total)}</p>
        </div>
      </div>

      <div>
        <label htmlFor="obs" className="text-xs font-bold uppercase tracking-wide text-[var(--store-text-muted)]">
          Observações para a equipe
        </label>
        <textarea
          id="obs"
          rows={3}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Ex.: cores predominantes, formato desejado, prazo..."
          className="mt-1 w-full rounded-[var(--store-radius-md)] border border-[var(--store-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--store-primary-light)] focus:ring-4 focus:ring-[var(--store-primary-light)]/15"
        />
      </div>

      <div className="grid gap-2">
        <a
          href={waLink(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--store-radius-md)] bg-[var(--store-success)] text-sm font-extrabold uppercase tracking-wide text-white shadow-[var(--store-shadow-md)] transition-transform hover:-translate-y-0.5"
        >
          <MessageCircle className="h-5 w-5" /> Comprar pelo WhatsApp
        </a>
        <button
          type="button"
          disabled
          className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-[var(--store-radius-md)] border border-[var(--store-border)] bg-white text-sm font-bold text-[var(--store-text-muted)]"
          title="Disponível em breve"
        >
          <ShoppingCart className="h-4 w-4" /> Adicionar ao carrinho (em breve)
        </button>
        <button
          type="button"
          disabled
          className="inline-flex h-11 cursor-not-allowed items-center justify-center gap-2 rounded-[var(--store-radius-md)] border border-dashed border-[var(--store-border-strong)] bg-white text-sm font-bold text-[var(--store-text-muted)]"
        >
          <Upload className="h-4 w-4" /> Enviar arte (em breve)
        </button>
      </div>
    </section>
  );
}

function InfoRow({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--store-radius-lg)] border border-[var(--store-border)] bg-white p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--store-primary)]/5 text-[var(--store-primary)]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-bold text-[var(--store-text)]">{title}</p>
        <p className="text-xs text-[var(--store-text-muted)]">{text}</p>
      </div>
    </div>
  );
}