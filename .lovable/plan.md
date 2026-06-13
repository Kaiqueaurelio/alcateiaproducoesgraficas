## Resumo

Construir um storefront público de gráfica online ao lado do painel administrativo atual (sem quebrar nada). O catálogo lê da tabela `services` que já existe. O painel `_authenticated/*` continua intacto. Entrego em 3 fases, com aprovação entre cada uma.

## O que será preservado

- Todas as rotas atuais sob `/_authenticated/*` (Dashboard, Clientes, Orçamentos, OS, Produção, Caixa, Contas a Receber, Serviços, Configurações).
- Autenticação, RLS, tabelas, edge functions e configurações de e-mail.
- O `AppShell` administrativo só aparece dentro de `/_authenticated/*`; o storefront usa seu próprio layout.

## Fase 1 — Fundação visual + Home + Catálogo (esta entrega)

**Design system (tokens em `src/styles.css`)**
- Paleta: `--primary #172554`, `--primary-light #2563eb`, `--secondary #facc15`, `--accent #f97316`, success/danger/warning, surfaces e borders.
- Tipografia: Inter (via `<link>` no `__root.tsx`), escala h1/h2/h3/p/small/price.
- Radius (`sm 6 / md 10 / lg 16 / xl 24`) e sombras `sm/md/lg`.
- Tokens mapeados em `@theme inline` (compatíveis com shadcn já existente).

**Componentes novos em `src/components/storefront/`**
- `StorefrontLayout` (header + footer + outlet)
- `TopPromoBar` ("Ganhe 10% OFF — cupom BEMVINDO10")
- `Header` (logo, busca grande, ações: Entrar, WhatsApp, Carrinho, Minha conta)
- `CategoryNav` (chips horizontais com scroll mobile)
- `HeroBanner` (degradê azul-marinho, CTA "Ver produtos" / "Enviar minha arte")
- `SectionTitle`, `ProductCard`, `ProductGrid`, `Badge`, `Rating`, `Price`, `ServiceCard`, `Footer`
- Microinterações: hover scale leve, sombra md, transição 200ms; skeleton no grid.

**Rotas públicas**
- `src/routes/index.tsx` → substitui o placeholder por Home: TopPromo + Header + Hero + "Favoritos dos clientes" + "Acabou de chegar" + "Serviços gráficos" + "Como funciona" + Footer.
- `src/routes/produtos.tsx` → catálogo completo com filtro por categoria e busca, lendo `services`.
- `src/routes/produto.$slug.tsx` → página de produto (galeria, infos, seletores básicos, observações, botões "Adicionar ao carrinho", "Comprar agora", "WhatsApp"). Sem checkout ainda.
- Cada rota com `head()` próprio (title, description, OG).

**Dados**
- Catálogo lê `public.services` (já existe) via server fn pública (`supabaseAdmin` dentro do handler) para funcionar em SSR sem login.
- Pequena migração: adiciona em `services` os campos opcionais `slug`, `category`, `image_url`, `short_description`, `rating`, `reviews_count`, `min_quantity`, `badge` (todos nullable, sem quebrar admin). O CRUD de Serviços continua funcionando — campos extras ficam vazios até o admin preencher.

**SEO/A11y**
- Single `<main>`, headings em ordem, labels nos inputs, alt em imagens, foco visível, contraste AA, tap targets ≥44px.

## Fase 2 — Carrinho, upload de arte e checkout via pedido

- `CartContext` (localStorage), página `/carrinho`, drawer no header.
- Página `/checkout`: dados do cliente, upload da arte (Supabase Storage bucket `arquivos`), forma de pagamento, observações.
- Ao finalizar: cria `client` (se novo), `order` + `order_items`, vincula arquivo em `order_files`. Dispara WhatsApp opcional.
- Página `/meus-pedidos` para o cliente acompanhar (usando login Supabase já existente).

## Fase 3 — Conteúdo e conversão

- Depoimentos (CMS simples no admin), FAQ accordion, "Como funciona" expandido, página `/sobre`, `/contato`.
- WhatsApp flutuante.
- Banner de cupom integrado ao checkout.
- Sitemap.xml + robots.txt.

## Detalhes técnicos (Fase 1)

- Stack: TanStack Start + React 19, Tailwind v4 com `@theme inline`, shadcn já presente.
- Fonte via `links` no `head()` do `__root.tsx` (preconnect + Inter).
- Server fn pública `listServices` em `src/lib/catalog.functions.ts` chamando `supabaseAdmin` dentro do handler (loader-safe em SSR).
- `useSuspenseQuery` no componente para hidratar.
- Sem `<a href>` para rotas tipadas — usar `<Link to params>`.
- `errorComponent` e `notFoundComponent` em cada rota com loader.
- Não toco em `src/integrations/supabase/*` autogerados.

Aprovo esta Fase 1 para começar?