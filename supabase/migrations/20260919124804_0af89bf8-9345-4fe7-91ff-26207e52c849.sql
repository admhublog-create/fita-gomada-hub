-- Settings
CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  rolls_per_box INT NOT NULL DEFAULT 15 CHECK (rolls_per_box > 0),
  alert_low_rolls INT NOT NULL DEFAULT 45 CHECK (alert_low_rolls >= 0),
  alert_critical_rolls INT NOT NULL DEFAULT 15 CHECK (alert_critical_rolls >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_all" ON public.settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
INSERT INTO public.settings (id) VALUES (1);

-- Purchases (financial history only)
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_date DATE NOT NULL,
  product TEXT NOT NULL,
  weight_kg NUMERIC(10,3),
  boxes INT,
  rolls INT,
  total_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  document TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchases TO anon, authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchases_all" ON public.purchases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Entries
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL,
  boxes INT NOT NULL DEFAULT 0 CHECK (boxes >= 0),
  loose_rolls INT NOT NULL DEFAULT 0 CHECK (loose_rolls >= 0),
  total_rolls INT NOT NULL CHECK (total_rolls > 0),
  supplier TEXT,
  document TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.entries TO anon, authenticated;
GRANT ALL ON public.entries TO service_role;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries_all" ON public.entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Withdrawals
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_date DATE NOT NULL,
  responsible TEXT NOT NULL,
  rolls INT NOT NULL CHECK (rolls > 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawals TO anon, authenticated;
GRANT ALL ON public.withdrawals TO service_role;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withdrawals_all" ON public.withdrawals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Inventories
CREATE TABLE public.inventories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_date DATE NOT NULL,
  boxes INT NOT NULL DEFAULT 0 CHECK (boxes >= 0),
  loose_rolls INT NOT NULL DEFAULT 0 CHECK (loose_rolls >= 0),
  counted_rolls INT NOT NULL CHECK (counted_rolls >= 0),
  system_balance_before INT NOT NULL DEFAULT 0,
  difference INT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventories TO anon, authenticated;
GRANT ALL ON public.inventories TO service_role;
ALTER TABLE public.inventories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventories_all" ON public.inventories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER purchases_updated BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER entries_updated BEFORE UPDATE ON public.entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER withdrawals_updated BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Balance: latest inventory baseline + entries after - withdrawals after
CREATE OR REPLACE FUNCTION public.current_balance(p_exclude_withdrawal UUID DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD;
  base INT := 0;
  base_date DATE := NULL;
  base_ts TIMESTAMPTZ := NULL;
  ent INT := 0;
  wd INT := 0;
BEGIN
  SELECT * INTO inv FROM public.inventories ORDER BY inventory_date DESC, created_at DESC LIMIT 1;
  IF FOUND THEN
    base := inv.counted_rolls; base_date := inv.inventory_date; base_ts := inv.created_at;
  END IF;
  SELECT COALESCE(SUM(total_rolls),0) INTO ent FROM public.entries
    WHERE base_date IS NULL OR entry_date > base_date OR (entry_date = base_date AND created_at > base_ts);
  SELECT COALESCE(SUM(rolls),0) INTO wd FROM public.withdrawals
    WHERE (p_exclude_withdrawal IS NULL OR id <> p_exclude_withdrawal)
      AND (base_date IS NULL OR withdrawal_date > base_date OR (withdrawal_date = base_date AND created_at > base_ts));
  RETURN base + ent - wd;
END; $$;
GRANT EXECUTE ON FUNCTION public.current_balance(UUID) TO anon, authenticated, service_role;

-- Prevent negative balance on withdrawals
CREATE OR REPLACE FUNCTION public.check_withdrawal_balance() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal INT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    bal := public.current_balance(OLD.id);
  ELSE
    bal := public.current_balance(NULL);
  END IF;
  IF bal - NEW.rolls < 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente: disponível % rolos, solicitado %', bal, NEW.rolls;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER withdrawals_check_balance BEFORE INSERT OR UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.check_withdrawal_balance();

-- Seed: initial inventory 19/09/2026
INSERT INTO public.inventories (inventory_date, boxes, loose_rolls, counted_rolls, system_balance_before, difference, notes)
VALUES ('2026-09-19', 7, 5, 110, 143, -33, 'Inventário inicial conferido — nova referência do estoque');

-- Seed: historical purchases (do not affect stock)
INSERT INTO public.purchases (purchase_date, product, weight_kg, boxes, rolls, total_value, supplier, document, notes) VALUES
('2026-03-17', 'Fita Gomada com Reforço 80mm SK791', 155.440, NULL, NULL, 2165.28, 'ALLTAPE', 'NF 00229603', 'Caixas/rolos não identificados'),
('2026-04-15', 'Fita Gomada com Reforço 80mm SK791', 160.000, NULL, NULL, 2267.20, 'ALLTAPE', 'Orçamento 035772', 'Caixas/rolos não informados'),
('2026-05-25', 'Fita Gomada com Reforço 70mm SK791', 166.230, 8, 120, 2355.48, 'ALLTAPE', 'NF 00229764', NULL),
('2026-07-13', 'Fita Gomada com Reforço 70mm SK791', 150.180, 7, 105, 2128.05, 'ALLTAPE', 'NF 00232217', NULL),
('2026-08-21', 'Fita Gomada com Reforço 70mm SK791', 190.280, 9, 135, 2696.27, 'ALLTAPE', 'NF 00234456', NULL);