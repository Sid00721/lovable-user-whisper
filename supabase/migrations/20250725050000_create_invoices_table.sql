CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES clients(id),
    amount_paid NUMERIC,
    created_at TIMESTAMPTZ,
    status TEXT,
    invoice_pdf TEXT
);