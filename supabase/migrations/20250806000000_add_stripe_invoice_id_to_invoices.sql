ALTER TABLE public.invoices
ADD COLUMN stripe_invoice_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON public.invoices(stripe_invoice_id);