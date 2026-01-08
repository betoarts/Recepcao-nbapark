ALTER TABLE app_settings
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_fields JSONB DEFAULT '[]'::jsonb;
