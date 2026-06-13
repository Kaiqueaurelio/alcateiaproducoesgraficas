import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  ShoppingCart,
  User,
  MessageCircle,
  Menu,
  Tag,
  Phone,
  Mail,
  MapPin,
  Instagram,
  Facebook,
} from "lucide-react";
import { STORE_CATEGORIES, waLink } from "./tokens";
import { useState } from "react";

export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-dvh bg-[var(--store-bg)] text-[var(--store-text)]"
      style={{ fontFamily: "var(--store-font)" }}
    >
      <TopPromoBar />
      <StoreHeader />
      <CategoryNav />
      <main className="min-h-[60vh]">{children}</main>
      <StoreFooter />
      <FloatingWhatsApp />
    </div>
  );
}

function TopPromoBar() {
  return (
    <div className="bg-[var(--store-secondary)] text-[var(--store-primary-dark)]">
      <div className="mx-auto flex min-h-10 max-w-[1280px] items-center justify-center gap-2 px-4 py-2 text-center text-[13px] font-semibold sm:text-sm">
        <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Ganhe <strong>10% OFF</strong> na sua primeira compra — cupom{" "}
          <strong className="rounded-md bg-[var(--store-primary)] px-2 py-0.5 text-[var(--store-secondary)]">
            BEMVINDO10
          </strong>
        </span>
      </div>
    </div>
  );
}

function StoreHeader() {
  const [q, setQ] = useState("");
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--store-border)] bg-[var(--store-surface)]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center gap-3 px-4 py-3 md:gap-6 md:py-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--store-primary)] p-1 shadow-sm md:h-12 md:w-12">
            <img
              src="/brand/alcateia-symbol.png"
              alt="Alcateia's"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="hidden leading-tight sm:block">
            <div className="text-base font-extrabold text-[var(--store-primary)]">
              Alcateia's
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--store-accent)]">
              Gráfica online
            </div>
          </div>
        </Link>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.location.href = `/produtos?q=${encodeURIComponent(q)}`;
          }}
          className="relative flex-1"
          role="search"
        >
          <label htmlFor="store-search" className="sr-only">
            O que você está procurando?
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--store-text-light)]" />
          <input
            id="store-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="O que você está procurando?"
            className="h-11 w-full rounded-[var(--store-radius-lg)] border border-[var(--store-border)] bg-white pl-12 pr-28 text-sm outline-none transition-all placeholder:text-[var(--store-text-light)] focus:border-[var(--store-primary-light)] focus:ring-4 focus:ring-[var(--store-primary-light)]/15 md:h-12 md:text-[15px]"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-[var(--store-radius-md)] bg-[var(--store-primary)] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[var(--store-primary-light)] md:px-4 md:py-2 md:text-sm"
          >
            Buscar
          </button>
        </form>

        <nav className="hidden items-center gap-1 md:flex">
          <a
            href={waLink("Olá! Vim do site da Alcateia's.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--store-text)] hover:bg-[var(--store-surface-soft)]"
          >
            <MessageCircle className="h-4 w-4 text-[var(--store-success)]" />
            Atendimento
          </a>
          <Link
            to="/auth"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[var(--store-text)] hover:bg-[var(--store-surface-soft)]"
          >
            <User className="h-4 w-4" />
            Entrar
          </Link>
          <button
            type="button"
            aria-label="Carrinho"
            className="relative flex items-center gap-1.5 rounded-lg bg-[var(--store-primary)] px-3 py-2 text-sm font-bold text-white hover:bg-[var(--store-primary-light)]"
          >
            <ShoppingCart className="h-4 w-4" />
            Carrinho
            <span className="ml-1 rounded-full bg-[var(--store-secondary)] px-1.5 text-[10px] font-extrabold text-[var(--store-primary-dark)]">
              0
            </span>
          </button>
        </nav>

        <button
          type="button"
          aria-label="Menu"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--store-border)] bg-white md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

function CategoryNav() {
  return (
    <nav
      aria-label="Categorias"
      className="border-b border-[var(--store-border)] bg-[var(--store-surface)]"
    >
      <div className="mx-auto flex max-w-[1280px] gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STORE_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            to="/produtos"
            search={{ cat: c.slug }}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-[var(--store-text-muted)] transition-colors hover:bg-[var(--store-surface-soft)] hover:text-[var(--store-primary)]"
            activeProps={{
              className:
                "shrink-0 rounded-full bg-[var(--store-primary)] px-4 py-2 text-sm font-semibold text-white",
            }}
          >
            {c.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function StoreFooter() {
  return (
    <footer className="mt-16 bg-[var(--store-primary-dark)] text-white">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 p-1">
              <img
                src="/brand/alcateia-symbol.png"
                alt="Alcateia's"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="text-lg font-extrabold">Alcateia's</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--store-secondary)]">
                Gráfica online
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Produtos personalizados com acabamento profissional para a sua marca aparecer mais.
          </p>
          <div className="mt-4 flex gap-2">
            <a
              href="#"
              aria-label="Instagram"
              className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="#"
              aria-label="Facebook"
              className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 hover:bg-white/20"
            >
              <Facebook className="h-4 w-4" />
            </a>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--store-secondary)]">
            Produtos
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            {STORE_CATEGORIES.slice(1, 6).map((c) => (
              <li key={c.slug}>
                <Link
                  to="/produtos"
                  search={{ cat: c.slug }}
                  className="hover:text-white"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--store-secondary)]">
            Atendimento
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" /> WhatsApp para orçamento
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" /> Seg a Sex, 9h às 18h
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" /> contato@alcateias.com.br
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> Retirada na loja ou entrega
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--store-secondary)]">
            Institucional
          </h3>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>
              <Link to="/produtos" className="hover:text-white">
                Catálogo completo
              </Link>
            </li>
            <li>
              <Link to="/auth" className="hover:text-white">
                Minha conta
              </Link>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Política de privacidade
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-white">
                Trocas e devoluções
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-white/50 md:flex-row">
          <p>© {new Date().getFullYear()} Alcateia's Produções Gráficas. Todos os direitos reservados.</p>
          <p>Feito com cuidado para sua marca brilhar.</p>
        </div>
      </div>
    </footer>
  );
}

function FloatingWhatsApp() {
  return (
    <a
      href={waLink("Olá! Gostaria de um orçamento.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[var(--store-success)] text-white shadow-lg transition-transform hover:scale-110"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}