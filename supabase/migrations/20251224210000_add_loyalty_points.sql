-- Add loyalty_points column to clients table for loyalty program
-- Clients earn points based on amount spent (1 real = 1 point)

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0;

-- Add loyalty_level computed based on points
-- Bronze: 0-499
-- Prata: 500-999  
-- Ouro: 1000-2499
-- Diamante: 2500+

COMMENT ON COLUMN public.clients.loyalty_points IS 'Pontos de fidelidade acumulados pelo cliente';
