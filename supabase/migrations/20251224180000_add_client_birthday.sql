-- Add client_birthday column to appointments table
-- This allows salon owners to identify birthday clients and send special offers

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS client_birthday DATE;

-- Add comment explaining the column
COMMENT ON COLUMN public.appointments.client_birthday IS 'Data de nascimento do cliente para envio de promoções de aniversário';
