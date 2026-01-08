-- Create app_settings table (singleton)
CREATE TABLE IF NOT EXISTS app_settings (
    id INT PRIMARY KEY DEFAULT 1,
    logo_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT single_row CHECK (id = 1)
);

-- RLS Policies
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read (for login screen)
CREATE POLICY "Allow public read of app_settings" ON app_settings
FOR SELECT USING (true);

-- Allow admin update
CREATE POLICY "Allow admin update of app_settings" ON app_settings
FOR UPDATE USING (
    exists (
    select 1 from employees
    where employees.id = auth.uid()
    and employees.role = 'admin'
    )
) WITH CHECK (
    exists (
    select 1 from employees
    where employees.id = auth.uid()
    and employees.role = 'admin'
    )
);

-- Allow admin insert (initial setup)
CREATE POLICY "Allow admin insert of app_settings" ON app_settings
FOR INSERT WITH CHECK (
    exists (
    select 1 from employees
    where employees.id = auth.uid()
    and employees.role = 'admin'
    )
);

-- Insert default row
INSERT INTO app_settings (id, logo_url)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;
