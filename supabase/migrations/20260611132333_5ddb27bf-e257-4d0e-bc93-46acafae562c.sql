
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('administrador','atendente','producao','financeiro');
CREATE TYPE public.production_status AS ENUM (
  'orcamento','aguardando_aprovacao','aguardando_arte','arte_em_criacao',
  'aguardando_pagamento','aprovado','em_producao','pausado',
  'pronto_para_retirada','entregue','cancelado'
);
CREATE TYPE public.payment_status AS ENUM ('nao_pago','sinal_pago','pago_parcial','pago_completo','em_atraso');
CREATE TYPE public.quote_status AS ENUM ('em_analise','enviado','aprovado','recusado');
CREATE TYPE public.cash_type AS ENUM ('entrada','saida');
CREATE TYPE public.receivable_status AS ENUM ('pendente','pago','vencido','cancelado');

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- USER ROLES first
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role='administrador')
$$;

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- AUTO PROFILE + AUTO ADMIN
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles(id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email)
    ON CONFLICT (id) DO NOTHING;
  SELECT NOT EXISTS(SELECT 1 FROM public.user_roles) INTO is_first;
  IF is_first OR LOWER(NEW.email) = 'alcateias@admin.br' THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'administrador') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'atendente') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CLIENTS
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  document TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  district TEXT,
  city TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_read_staff" ON public.clients FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente')
  OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'producao')
);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'));
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'));
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SERVICES
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'un',
  default_deadline_days INT DEFAULT 3,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_read" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services_insert" ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'));
CREATE POLICY "services_update" ON public.services FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'));
CREATE POLICY "services_delete" ON public.services FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- QUOTES
CREATE SEQUENCE public.quote_number_seq START 1000;
CREATE TABLE public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT NOT NULL UNIQUE DEFAULT nextval('public.quote_number_seq'),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  status public.quote_status NOT NULL DEFAULT 'em_analise',
  description TEXT,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  validity_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quotes_read" ON public.quotes FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente') OR public.has_role(auth.uid(),'financeiro')
);
CREATE POLICY "quotes_insert" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'));
CREATE POLICY "quotes_update" ON public.quotes FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'));
CREATE POLICY "quotes_delete" ON public.quotes FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items TO authenticated;
GRANT ALL ON public.quote_items TO service_role;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qi_read" ON public.quote_items FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente') OR public.has_role(auth.uid(),'financeiro')
);
CREATE POLICY "qi_all" ON public.quote_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'));

-- ORDERS
CREATE SEQUENCE public.order_number_seq START 1000;
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT NOT NULL UNIQUE DEFAULT nextval('public.order_number_seq'),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  attendant_id UUID REFERENCES auth.users(id),
  title TEXT,
  description TEXT,
  measurements TEXT,
  material TEXT,
  finishing TEXT,
  client_notes TEXT,
  internal_notes TEXT,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  payment_status public.payment_status NOT NULL DEFAULT 'nao_pago',
  production_status public.production_status NOT NULL DEFAULT 'aguardando_arte',
  deadline DATE,
  urgent BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_read" ON public.orders FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente')
  OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'producao')
);
CREATE POLICY "orders_insert" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'));
CREATE POLICY "orders_update" ON public.orders FOR UPDATE TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente')
  OR public.has_role(auth.uid(),'producao') OR public.has_role(auth.uid(),'financeiro')
);
CREATE POLICY "orders_delete" ON public.orders FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id),
  description TEXT NOT NULL,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oi_read" ON public.order_items FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente')
  OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'producao')
);
CREATE POLICY "oi_all" ON public.order_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'));

CREATE TABLE public.order_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.order_files TO authenticated;
GRANT ALL ON public.order_files TO service_role;
ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "of_read" ON public.order_files FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente')
  OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'producao')
);
CREATE POLICY "of_insert" ON public.order_files FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente') OR public.has_role(auth.uid(),'producao'));
CREATE POLICY "of_delete" ON public.order_files FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'atendente'));

-- CASH
CREATE TABLE public.cash_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.cash_type NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  amount NUMERIC(12,2) NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  receivable_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_entries TO authenticated;
GRANT ALL ON public.cash_entries TO service_role;
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_read" ON public.cash_entries FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro')
);
CREATE POLICY "cash_insert" ON public.cash_entries FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro'));
CREATE POLICY "cash_update" ON public.cash_entries FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro'));
CREATE POLICY "cash_delete" ON public.cash_entries FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- RECEIVABLES
CREATE TABLE public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  status public.receivable_status NOT NULL DEFAULT 'pendente',
  payment_method TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receivables TO authenticated;
GRANT ALL ON public.receivables TO service_role;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_read" ON public.receivables FOR SELECT TO authenticated USING (
  public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'atendente')
);
CREATE POLICY "rec_insert" ON public.receivables FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro') OR public.has_role(auth.uid(),'atendente'));
CREATE POLICY "rec_update" ON public.receivables FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'financeiro'));
CREATE POLICY "rec_delete" ON public.receivables FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_receivables_updated BEFORE UPDATE ON public.receivables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- COMPANY SETTINGS
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Alcateia''s Produções Gráficas',
  whatsapp TEXT DEFAULT '(11) 97223-5342',
  instagram TEXT DEFAULT '@alcateiasproducoesgraficas',
  address TEXT DEFAULT 'Galeria Vila Marcondes',
  document TEXT,
  logo_url TEXT,
  default_quote_text TEXT,
  default_order_text TEXT,
  default_deadline_days INT DEFAULT 3,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_read" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "cs_insert" ON public.company_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "cs_update" ON public.company_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
INSERT INTO public.company_settings (name) VALUES ('Alcateia''s Produções Gráficas');

-- ORDER PAYMENT STATUS TRIGGERS
CREATE OR REPLACE FUNCTION public.sync_order_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.paid <= 0 THEN NEW.payment_status := 'nao_pago';
  ELSIF NEW.paid >= NEW.total THEN NEW.payment_status := 'pago_completo';
  ELSE NEW.payment_status := 'pago_parcial';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_orders_payment BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_payment_status();

CREATE OR REPLACE FUNCTION public.sync_order_receivable_after()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE remaining NUMERIC(12,2); rec_id UUID;
BEGIN
  remaining := COALESCE(NEW.total,0) - COALESCE(NEW.paid,0);
  SELECT id INTO rec_id FROM public.receivables WHERE order_id = NEW.id LIMIT 1;
  IF remaining > 0 THEN
    IF rec_id IS NULL THEN
      INSERT INTO public.receivables(client_id, order_id, amount, due_date, status)
        VALUES (NEW.client_id, NEW.id, remaining, NEW.deadline, 'pendente');
    ELSE
      UPDATE public.receivables SET amount = remaining, due_date = NEW.deadline WHERE id = rec_id;
    END IF;
  ELSIF rec_id IS NOT NULL THEN
    UPDATE public.receivables SET amount = 0, status='pago', paid_at = COALESCE(paid_at, now()) WHERE id = rec_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_orders_sync_rec AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_receivable_after();

CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_status ON public.orders(production_status);
CREATE INDEX idx_quotes_client ON public.quotes(client_id);
CREATE INDEX idx_cash_date ON public.cash_entries(entry_date);
CREATE INDEX idx_receivables_due ON public.receivables(due_date);
