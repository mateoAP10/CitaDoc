CREATE TABLE IF NOT EXISTS promo_codes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text UNIQUE NOT NULL,
  discount_pct integer NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 100),
  max_uses     integer,
  uses         integer NOT NULL DEFAULT 0,
  expires_at   date,
  active       boolean NOT NULL DEFAULT true,
  plans        text[] DEFAULT ARRAY['pro_web','pro','maint'],
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_active" ON promo_codes FOR SELECT USING (active = true);
