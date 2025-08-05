-- Add subscription-related columns to the clients table
ALTER TABLE clients ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE clients ADD COLUMN subscription_status TEXT;
ALTER TABLE clients ADD COLUMN subscription_product TEXT;
ALTER TABLE clients ADD COLUMN subscription_plan TEXT;
ALTER TABLE clients ADD COLUMN last_payment_date DATE;

-- Add comments for clarity
COMMENT ON COLUMN clients.stripe_customer_id IS 'Stripe customer ID for subscription management';
COMMENT ON COLUMN clients.subscription_status IS 'Current subscription status (active, canceled, past_due, etc.)';
COMMENT ON COLUMN clients.subscription_product IS 'Name of the subscribed product';
COMMENT ON COLUMN clients.subscription_plan IS 'Subscription plan identifier or nickname';
COMMENT ON COLUMN clients.last_payment_date IS 'Date of the last successful payment';

-- Create an index on stripe_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_stripe_customer_id ON clients(stripe_customer_id);

-- Create an index on subscription_status for filtering
CREATE INDEX IF NOT EXISTS idx_clients_subscription_status ON clients(subscription_status);