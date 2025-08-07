-- Migration to clean up duplicate transaction entries and improve data integrity
-- This addresses the issue where sync scripts created duplicate entries with different IDs

-- Remove duplicate invoice entries where stripe_invoice_id is NULL but id matches a Stripe invoice ID
-- These are likely entries created by sync scripts that used Stripe invoice IDs as primary keys
DELETE FROM public.invoices 
WHERE stripe_invoice_id IS NULL 
AND id::text IN (
  SELECT DISTINCT stripe_invoice_id 
  FROM public.invoices 
  WHERE stripe_invoice_id IS NOT NULL
);

-- Add a unique constraint to prevent future duplicates
ALTER TABLE public.invoices 
ADD CONSTRAINT unique_stripe_invoice_id 
UNIQUE (stripe_invoice_id);

-- Add comment explaining the transaction-focused approach
COMMENT ON TABLE public.invoices IS 'Stores individual payment transactions from Stripe. Each row represents a single payment event, not a monthly invoice summary. Monthly billing views are generated dynamically in the frontend.';
COMMENT ON COLUMN public.invoices.stripe_invoice_id IS 'Unique Stripe invoice ID to prevent duplicate transaction entries';
COMMENT ON COLUMN public.invoices.amount_paid IS 'Amount paid for this specific transaction in dollars';
COMMENT ON COLUMN public.invoices.created_at IS 'Timestamp when the payment transaction occurred';