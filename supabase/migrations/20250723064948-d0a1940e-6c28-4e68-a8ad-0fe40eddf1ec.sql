-- Update RLS policies to allow anonymous access for internal CRM
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.clients;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.notes;

-- Create new policies that allow anonymous access (since this is internal CRM)
CREATE POLICY "Allow all operations for everyone" ON public.clients FOR ALL USING (true);
CREATE POLICY "Allow all operations for everyone" ON public.employees FOR ALL USING (true);
CREATE POLICY "Allow all operations for everyone" ON public.notes FOR ALL USING (true);