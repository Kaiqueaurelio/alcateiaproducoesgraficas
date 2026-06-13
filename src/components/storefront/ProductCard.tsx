import { Link } from "@tanstack/react-router";
import { Star, ShoppingBag } from "lucide-react";
import { brl } from "./tokens";

export type StoreProduct = {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  short_description: string | null;
  base_price: number | string;
  image_url: string | null;
  rating: number | string | null;
  reviews_count: number | null;
  min_quantity: number | null;
  badge: string | null;
  specs: string[] | null;
  unit: string | null;
};

const BADGE_TONE: Record<string, string> = {
  "Mais vendido": "bg-[var(--store-secondary)] text-[var(--store-primary-dark)]",
  Promoção: "bg-[var(--store-accent)] text-white",
  Lançamento: "bg-[var(--store-primary-light)] text-white",
  "Arte grátis": "bg-[var(--store-success)] text-white",
  "Produção rápida": "bg-[var(--store-warning)] text-white",
};

export function ProductCard({ product }: { product: StoreProduct }) {
  const slug = product.slug ?? product.id;
  const tone = product.badge ? BADGE_TONE[product.badge] ?? "bg-[var(--store-primary)] text-white" : null;
  const rating = product.rating ? Number(product.rating) : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--store-radius-lg)] border border-[var(--store-border)] bg-white shadow-[var(--store-shadow-sm)] transition-all duration-200 hover:-translate-y-1 hover:border-[var(--store-primary-light)]/40 hover:shadow-[var(--store-shadow-md)]">
      <Link
        to="/produto/$slug"
        params={{ slug }}
        className="relative block aspect-[4/3] overflow-hidden bg-[var(--store-surface-soft)]"
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[var(--store-text-light)]">
            <ShoppingBag className="h-12 w-12" />
          </div>
        )}
        {product.badge && tone && (
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${tone}`}
          >
            {product.badge}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--store-accent)]">
          {product.category ?? "Personalizado"}
        </p>
        <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-snug text-[var(--store-text)]">
          <Link to="/produto/$slug" params={{ slug }} className="hover:text-[var(--store-primary)]">
            {product.name}
          </Link>
        </h3>
        {rating != null && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-[var(--store-text-muted)]">
            <Star className="h-3.5 w-3.5 fill-[var(--store-secondary)] text-[var(--store-secondary)]" />
            <span className="font-semibold text-[var(--store-text)]">{rating.toFixed(1)}</span>
            <span>({product.reviews_count ?? 0})</span>
          </div>
        )}
        {product.short_description && (
          <p className="mt-2 line-clamp-2 text-xs text-[var(--store-text-muted)]">
            {product.short_description}
          </p>
        )}
        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-[var(--store-text-light)]">
              A partir de
            </p>
            <p className="text-xl font-extrabold leading-tight text-[var(--store-primary)]">
              {brl(product.base_price)}
            </p>
            {product.min_quantity ? (
              <p className="text-[11px] text-[var(--store-text-muted)]">
                a partir de {product.min_quantity} {product.unit ?? "un"}
              </p>
            ) : null}
          </div>
        </div>
        <Link
          to="/produto/$slug"
          params={{ slug }}
          className="mt-4 inline-flex h-10 items-center justify-center rounded-[var(--store-radius-md)] bg-[var(--store-primary)] text-sm font-bold text-white transition-colors hover:bg-[var(--store-primary-light)]"
        >
          Ver produto
        </Link>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--store-radius-lg)] border border-[var(--store-border)] bg-white">
      <div className="aspect-[4/3] animate-pulse bg-[var(--store-surface-soft)]" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-16 animate-pulse rounded bg-[var(--store-surface-soft)]" />
        <div className="h-4 w-full animate-pulse rounded bg-[var(--store-surface-soft)]" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--store-surface-soft)]" />
        <div className="mt-4 h-10 animate-pulse rounded bg-[var(--store-surface-soft)]" />
      </div>
    </div>
  );
}

export function ProductGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}

export function SectionHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {kicker && (
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--store-accent)]">
            {kicker}
          </p>
        )}
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--store-primary)] sm:text-[28px]">
          {title}
        </h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-[var(--store-text-muted)]">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}