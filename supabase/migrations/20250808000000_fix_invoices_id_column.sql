ALTER TABLE public.invoices
ALTER COLUMN id SET DATA TYPE UUID USING (gen_random_uuid()),
ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.invoices
ALTER COLUMN client_id SET DATA TYPE UUID USING (client_id::UUID);