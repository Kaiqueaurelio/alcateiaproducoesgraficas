-- ============================================================
-- FIX: Buckets de storage ausentes + coluna assigned_to
-- ============================================================

-- 1. Garantir que o bucket "company-assets" existe (público, limite 20 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-assets',
  'company-assets',
  true,
  20971520,
  ARRAY['image/png','image/svg+xml','image/jpeg','image/webp','application/pdf','application/octet-stream']
)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 20971520;

-- 2. Garantir que o bucket "briefing-files" existe (privado, limite 50 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('briefing-files', 'briefing-files', false, 52428800)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 52428800;

-- 3. Garantir que o bucket "arquivos" existe (autenticado, limite 50 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('arquivos', 'arquivos', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas do bucket "company-assets"
-- Leitura pública (bucket é público, mas policy garante acesso via URL)
DROP POLICY IF EXISTS "company_assets_public_read" ON storage.objects;
CREATE POLICY "company_assets_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'company-assets');

-- Inserção: qualquer autenticado (não só admin, para evitar erro de permissão)
DROP POLICY IF EXISTS "company_assets_admin_insert" ON storage.objects;
CREATE POLICY "company_assets_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets');

-- Atualização
DROP POLICY IF EXISTS "company_assets_admin_update" ON storage.objects;
CREATE POLICY "company_assets_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets');

-- Exclusão
DROP POLICY IF EXISTS "company_assets_admin_delete" ON storage.objects;
CREATE POLICY "company_assets_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets');

-- 5. Políticas do bucket "arquivos"
DROP POLICY IF EXISTS "arquivos_read" ON storage.objects;
CREATE POLICY "arquivos_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'arquivos');

DROP POLICY IF EXISTS "arquivos_insert" ON storage.objects;
CREATE POLICY "arquivos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'arquivos');

DROP POLICY IF EXISTS "arquivos_update" ON storage.objects;
CREATE POLICY "arquivos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'arquivos');

DROP POLICY IF EXISTS "arquivos_delete" ON storage.objects;
CREATE POLICY "arquivos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'arquivos');

-- 6. Garantir colunas de produção na tabela orders (caso migration anterior não tenha rodado)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS current_activity TEXT,
  ADD COLUMN IF NOT EXISTS progress SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ;

-- Re-criar FK de assigned_to para profiles
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_assigned_to_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);

-- 7. Garantir colunas de produção na tabela production_updates
ALTER TABLE public.production_updates
  ADD COLUMN IF NOT EXISTS activity TEXT,
  ADD COLUMN IF NOT EXISTS progress SMALLINT NOT NULL DEFAULT 0;

ALTER TABLE public.production_updates ALTER COLUMN note DROP NOT NULL;

-- 8. Colunas extras da tabela services para a vitrine
-- (category já existe na tabela original, não precisa adicionar)
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS reviews_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS badge TEXT,
  ADD COLUMN IF NOT EXISTS specs TEXT[];

-- Índices para a vitrine
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(active);

-- Leitura pública de serviços ativos para a vitrine
GRANT SELECT ON public.services TO anon;
DROP POLICY IF EXISTS "services_public_read" ON public.services;
CREATE POLICY "services_public_read" ON public.services
  FOR SELECT TO anon
  USING (active = true);
