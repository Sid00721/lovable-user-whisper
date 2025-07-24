-- Add missing columns to the clients table
ALTER TABLE public.clients 
ADD COLUMN notes text,
ADD COLUMN commission_approved boolean DEFAULT false;