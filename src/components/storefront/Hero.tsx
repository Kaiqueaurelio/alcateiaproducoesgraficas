import { Link } from "@tanstack/react-router";
import { ArrowRight, Upload, Sparkles, Truck, Award } from "lucide-react";
import { waLink } from "./tokens";

export function Hero() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pt-6 sm:pt-10">
      <div
        className="relative overflow-hidden rounded-[var(--store-radius-xl)] px-6 py-10 text-white sm:px-12 sm:py-16"
        style={{
          backgroundImage:
            "radial-gradient(circle at 90% 0%, rgba(250,204,21,0.18), transparent 40%), radial-gradient(circle at 10% 100%, rgba(249,115,22,0.22), transparent 45%), linear-gradient(135deg, #0f172a 0%, #172554 55%, #2563eb 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-[0.08]" aria-hidden="true">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[var(--store-secondary)]" />
              Produção em até 48h úteis
            </span>
            <h1 className="mt-5 text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[56px]">
              Produtos personalizados para sua{" "}
              <span className="text-[var(--store-secondary)]">marca aparecer mais</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
              Canecas, camisetas, adesivos, banners, brindes e muito mais com acabamento
              profissional e atendimento humano.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/produtos"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--store-radius-md)] bg-[var(--store-secondary)] px-6 text-sm font-extrabold uppercase tracking-wide text-[var(--store-primary-dark)] shadow-[var(--store-shadow-md)] transition-transform hover:-translate-y-0.5 hover:bg-[var(--store-secondary-dark)]"
              >
                Ver produtos <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={waLink("Olá! Quero enviar minha arte para um orçamento.")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--store-radius-md)] border border-white/30 bg-white/5 px-6 text-sm font-extrabold uppercase tracking-wide text-white transition-colors hover:bg-white/15"
              >
                <Upload className="h-4 w-4" /> Enviar minha arte
              </a>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-4 text-xs">
              <Feature icon={Award} label="Qualidade profissional" />
              <Feature icon={Truck} label="Entrega ou retirada" />
              <Feature icon={Sparkles} label="Arte sob medida" />
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute -left-10 top-10 h-44 w-44 rounded-[var(--store-radius-xl)] bg-[var(--store-secondary)]/30 blur-2xl" />
            <div className="relative rounded-[var(--store-radius-xl)] border border-white/15 bg-white/5 p-4 shadow-2xl backdrop-blur">
              <img
                src="https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=900&q=80"
                alt="Mockup de produtos gráficos personalizados"
                className="aspect-[4/3] w-full rounded-[var(--store-radius-lg)] object-cover"
              />
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="rounded-full bg-[var(--store-secondary)] px-3 py-1 font-bold text-[var(--store-primary-dark)]">
                  Mais vendido
                </span>
                <span className="font-semibold text-white/80">A partir de R$ 39,90</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Feature({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 text-white/85">
      <Icon className="h-4 w-4 text-[var(--store-secondary)]" />
      <span className="font-semibold">{label}</span>
    </div>
  );
}