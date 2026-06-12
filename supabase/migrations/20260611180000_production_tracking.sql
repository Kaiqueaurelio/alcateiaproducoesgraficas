ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_activity TEXT,
  ADD COLUMN IF NOT EXISTS progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.production_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  status public.production_status NOT NULL,
  activity TEXT NOT NULL,
  note TEXT,
  progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_updates TO authenticated;
GRANT ALL ON public.production_updates TO service_role;
ALTER TABLE public.production_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "production_updates_read" ON public.production_updates FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'atendente')
  OR public.has_role(auth.uid(), 'financeiro') OR public.has_role(auth.uid(), 'producao')
);
CREATE POLICY "production_updates_insert" ON public.production_updates FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid() AND (
    public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'atendente')
    OR public.has_role(auth.uid(), 'producao')
  )
);
CREATE POLICY "production_updates_update" ON public.production_updates FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "production_updates_delete" ON public.production_updates FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_production_updates_order_created
  ON public.production_updates(order_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.sync_order_from_production_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orders
  SET production_status = NEW.status,
      current_activity = NEW.activity,
      progress = NEW.progress,
      last_progress_at = NEW.created_at
  WHERE id = NEW.order_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_order_production_update ON public.production_updates;
CREATE TRIGGER trg_sync_order_production_update
  AFTER INSERT ON public.production_updates
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_from_production_update();
