
-- Add assignee fields to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assignee_name TEXT;

-- Production updates table (timeline of who is doing what)
CREATE TABLE IF NOT EXISTS public.production_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  status public.production_status,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_updates TO authenticated;
GRANT ALL ON public.production_updates TO service_role;

ALTER TABLE public.production_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read production updates"
  ON public.production_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert production updates"
  ON public.production_updates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Author or admin update"
  ON public.production_updates FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Author or admin delete"
  ON public.production_updates FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_prod_updates_order ON public.production_updates(order_id, created_at DESC);
