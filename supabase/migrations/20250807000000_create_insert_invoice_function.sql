CREATE OR REPLACE FUNCTION insert_invoice(
    p_client_id UUID,
    p_stripe_invoice_id TEXT,
    p_amount_paid DECIMAL,
    p_created_at TIMESTAMPTZ,
    p_status TEXT,
    p_invoice_pdf TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.invoices (client_id, stripe_invoice_id, amount_paid, created_at, status, invoice_pdf)
    VALUES (p_client_id, p_stripe_invoice_id, p_amount_paid, p_created_at, p_status, p_invoice_pdf);
END;
$$ LANGUAGE plpgsql;