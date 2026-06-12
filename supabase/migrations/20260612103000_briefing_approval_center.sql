-- Central de Briefing e aprovacao de artes. Estruturas aditivas e retrocompativeis.
CREATE TABLE IF NOT EXISTS public.briefing_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ,
  CHECK (order_id IS NOT NULL OR quote_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_briefing_link_order_active
  ON public.briefing_links(order_id) WHERE order_id IS NOT NULL AND active;
CREATE INDEX IF NOT EXISTS idx_briefing_link_token ON public.briefing_links(token);

CREATE TABLE IF NOT EXISTS public.client_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL UNIQUE REFERENCES public.briefing_links(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  product_type TEXT NOT NULL,
  quantity NUMERIC(12,2),
  desired_deadline DATE,
  observations TEXT,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.briefing_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.briefing_links(id) ON DELETE CASCADE,
  briefing_id UUID REFERENCES public.client_briefings(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'referencia',
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_client BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.art_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  link_id UUID NOT NULL REFERENCES public.briefing_links(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  title TEXT,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando_aprovacao'
    CHECK (status IN ('rascunho','aguardando_aprovacao','alteracao_solicitada','aprovado')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  UNIQUE(order_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.art_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  art_version_id UUID NOT NULL REFERENCES public.art_versions(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('cliente','equipe')),
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  comment TEXT NOT NULL,
  marker_x NUMERIC(6,3),
  marker_y NUMERIC(6,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefing_links, public.client_briefings,
  public.briefing_files, public.art_versions, public.art_comments TO authenticated;
GRANT ALL ON public.briefing_links, public.client_briefings, public.briefing_files,
  public.art_versions, public.art_comments TO service_role;

ALTER TABLE public.briefing_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.briefing_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.art_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.art_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "briefing_links_staff" ON public.briefing_links FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "client_briefings_staff" ON public.client_briefings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "briefing_files_staff" ON public.briefing_files FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "art_versions_staff" ON public.art_versions FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY "art_comments_staff" ON public.art_comments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Permite que os membros da equipe aparecam nos seletores de responsavel.
CREATE POLICY "profiles_team_read" ON public.profiles FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'atendente')
    OR public.has_role(auth.uid(), 'producao') OR public.has_role(auth.uid(), 'financeiro')
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('briefing-files', 'briefing-files', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('company-assets', 'company-assets', true, 20971520)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 20971520;

CREATE OR REPLACE FUNCTION public.is_valid_briefing_token(_token TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.briefing_links
    WHERE token::text = _token AND active AND (expires_at IS NULL OR expires_at > now())
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_valid_briefing_token(TEXT) TO anon, authenticated;

CREATE POLICY "briefing_storage_staff_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'briefing-files');
CREATE POLICY "briefing_storage_staff_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'briefing-files');
CREATE POLICY "briefing_storage_staff_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'briefing-files');
CREATE POLICY "briefing_storage_staff_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'briefing-files');

-- O primeiro diretorio e o token secreto do link. O cliente nao consegue listar
-- outros pedidos e so acessa arquivos do token que recebeu.
CREATE POLICY "briefing_storage_public_token_read" ON storage.objects FOR SELECT TO anon
  USING (
    bucket_id = 'briefing-files'
    AND public.is_valid_briefing_token((storage.foldername(name))[1])
  );
CREATE POLICY "briefing_storage_public_token_insert" ON storage.objects FOR INSERT TO anon
  WITH CHECK (
    bucket_id = 'briefing-files'
    AND public.is_valid_briefing_token((storage.foldername(name))[1])
    AND lower(storage.extension(name)) IN ('png','jpg','jpeg','pdf','svg','webp','cdr','ai','psd')
  );

CREATE POLICY "company_assets_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets' AND public.is_admin(auth.uid()));
CREATE POLICY "company_assets_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets' AND public.is_admin(auth.uid()));
CREATE POLICY "company_assets_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets' AND public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.get_public_briefing(_token UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
DECLARE result JSONB; link_row public.briefing_links;
BEGIN
  SELECT * INTO link_row FROM public.briefing_links
  WHERE token = _token AND active AND (expires_at IS NULL OR expires_at > now());
  IF link_row.id IS NULL THEN RAISE EXCEPTION 'Link invalido ou expirado'; END IF;
  UPDATE public.briefing_links SET last_accessed_at = now() WHERE id = link_row.id;
  SELECT jsonb_build_object(
    'link', jsonb_build_object('id', link_row.id, 'token', link_row.token, 'order_id', link_row.order_id, 'quote_id', link_row.quote_id),
    'order', (SELECT to_jsonb(o) || jsonb_build_object('client_name', c.name) FROM public.orders o JOIN public.clients c ON c.id=o.client_id WHERE o.id=link_row.order_id),
    'quote', (SELECT to_jsonb(q) || jsonb_build_object('client_name', c.name) FROM public.quotes q JOIN public.clients c ON c.id=q.client_id WHERE q.id=link_row.quote_id),
    'briefing', (SELECT to_jsonb(b) FROM public.client_briefings b WHERE b.link_id=link_row.id),
    'files', COALESCE((SELECT jsonb_agg(to_jsonb(f) ORDER BY f.created_at DESC) FROM public.briefing_files f WHERE f.link_id=link_row.id), '[]'::jsonb),
    'versions', COALESCE((SELECT jsonb_agg(to_jsonb(v) || jsonb_build_object('comments',
      COALESCE((SELECT jsonb_agg(to_jsonb(ac) ORDER BY ac.created_at) FROM public.art_comments ac WHERE ac.art_version_id=v.id), '[]'::jsonb)
    ) ORDER BY v.version_number DESC) FROM public.art_versions v WHERE v.link_id=link_row.id AND v.status <> 'rascunho'), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END; $$;

CREATE OR REPLACE FUNCTION public.submit_public_briefing(_token UUID, _payload JSONB, _files JSONB DEFAULT '[]'::jsonb)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link_row public.briefing_links; briefing_id UUID; file_row JSONB;
BEGIN
  SELECT * INTO link_row FROM public.briefing_links
  WHERE token=_token AND active AND (expires_at IS NULL OR expires_at > now());
  IF link_row.id IS NULL THEN RAISE EXCEPTION 'Link invalido ou expirado'; END IF;
  INSERT INTO public.client_briefings(link_id,order_id,quote_id,client_name,whatsapp,product_type,quantity,desired_deadline,observations,answers,submitted_at,updated_at)
  VALUES(link_row.id,link_row.order_id,link_row.quote_id,_payload->>'client_name',_payload->>'whatsapp',_payload->>'product_type',
    NULLIF(_payload->>'quantity','')::numeric,NULLIF(_payload->>'desired_deadline','')::date,_payload->>'observations',COALESCE(_payload->'answers','{}'::jsonb),now(),now())
  ON CONFLICT(link_id) DO UPDATE SET client_name=EXCLUDED.client_name,whatsapp=EXCLUDED.whatsapp,product_type=EXCLUDED.product_type,
    quantity=EXCLUDED.quantity,desired_deadline=EXCLUDED.desired_deadline,observations=EXCLUDED.observations,answers=EXCLUDED.answers,submitted_at=now(),updated_at=now()
  RETURNING id INTO briefing_id;
  FOR file_row IN SELECT * FROM jsonb_array_elements(COALESCE(_files,'[]'::jsonb)) LOOP
    INSERT INTO public.briefing_files(link_id,briefing_id,order_id,category,storage_path,file_name,mime_type,size_bytes,uploaded_by_client)
    VALUES(link_row.id,briefing_id,link_row.order_id,COALESCE(file_row->>'category','referencia'),file_row->>'storage_path',file_row->>'file_name',file_row->>'mime_type',
      NULLIF(file_row->>'size_bytes','')::bigint,true) ON CONFLICT(storage_path) DO NOTHING;
  END LOOP;
  IF link_row.order_id IS NOT NULL THEN
    UPDATE public.orders SET production_status='aguardando_arte', current_activity='Briefing recebido do cliente', last_progress_at=now() WHERE id=link_row.order_id;
  END IF;
  RETURN briefing_id;
END; $$;

CREATE OR REPLACE FUNCTION public.review_public_art(_token UUID, _version_id UUID, _decision TEXT, _comment TEXT DEFAULT NULL,
  _marker_x NUMERIC DEFAULT NULL, _marker_y NUMERIC DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE link_row public.briefing_links; version_row public.art_versions; customer_name TEXT;
BEGIN
  SELECT * INTO link_row FROM public.briefing_links WHERE token=_token AND active AND (expires_at IS NULL OR expires_at > now());
  SELECT * INTO version_row FROM public.art_versions WHERE id=_version_id AND link_id=link_row.id;
  IF link_row.id IS NULL OR version_row.id IS NULL THEN RAISE EXCEPTION 'Versao nao encontrada'; END IF;
  IF _decision NOT IN ('aprovado','alteracao_solicitada') THEN RAISE EXCEPTION 'Decisao invalida'; END IF;
  SELECT client_name INTO customer_name FROM public.client_briefings WHERE link_id=link_row.id;
  UPDATE public.art_versions SET status=_decision,client_comment=_comment,reviewed_at=now() WHERE id=_version_id;
  IF COALESCE(trim(_comment),'') <> '' THEN
    INSERT INTO public.art_comments(art_version_id,author_type,author_name,comment,marker_x,marker_y)
    VALUES(_version_id,'cliente',COALESCE(customer_name,'Cliente'),_comment,_marker_x,_marker_y);
  END IF;
  IF _decision='aprovado' THEN
    UPDATE public.orders SET production_status='aprovado',current_activity='Arte aprovada pelo cliente',progress=GREATEST(progress,40),last_progress_at=now() WHERE id=version_row.order_id;
  ELSE
    UPDATE public.orders SET production_status='arte_em_criacao',current_activity='Cliente solicitou alteracao na arte',last_progress_at=now() WHERE id=version_row.order_id;
  END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_public_briefing(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_briefing(UUID, JSONB, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.review_public_art(UUID, UUID, TEXT, TEXT, NUMERIC, NUMERIC) TO anon, authenticated;
