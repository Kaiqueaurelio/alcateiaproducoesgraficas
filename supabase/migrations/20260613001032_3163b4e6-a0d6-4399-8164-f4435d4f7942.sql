
-- Add production tracking columns expected by the app
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_to UUID,
  ADD COLUMN IF NOT EXISTS current_activity TEXT,
  ADD COLUMN IF NOT EXISTS progress SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_progress_at TIMESTAMPTZ;

-- Re-link assigned_to FK to profiles (named exactly as the client embeds it)
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_assigned_to_fkey;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_to ON public.orders(assigned_to);

-- Backfill from legacy assignee_id (if any rows existed)
UPDATE public.orders SET assigned_to = assignee_id
WHERE assigned_to IS NULL AND assignee_id IS NOT NULL;

-- Ensure production_updates has the columns the app reads/writes
ALTER TABLE public.production_updates
  ADD COLUMN IF NOT EXISTS activity TEXT,
  ADD COLUMN IF NOT EXISTS progress SMALLINT NOT NULL DEFAULT 0;

-- Make `note` optional (the app posts activity+progress, note can be empty)
ALTER TABLE public.production_updates ALTER COLUMN note DROP NOT NULL;

-- Re-link author_id FK to profiles with the exact name the client embeds
ALTER TABLE public.production_updates DROP CONSTRAINT IF EXISTS production_updates_author_id_fkey;
ALTER TABLE public.production_updates
  ADD CONSTRAINT production_updates_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- Keep orders in sync when an update is posted
CREATE OR REPLACE FUNCTION public.sync_order_from_production_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orders
  SET production_status = COALESCE(NEW.status, production_status),
      current_activity = COALESCE(NEW.activity, current_activity),
      progress = COALESCE(NEW.progress, progress),
      last_progress_at = NEW.created_at
  WHERE id = NEW.order_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_order_production_update ON public.production_updates;
CREATE TRIGGER trg_sync_order_production_update
  AFTER INSERT ON public.production_updates
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_from_production_update();
