-- Adicionar coluna pix_key na tabela salons
ALTER TABLE public.salons
ADD COLUMN IF NOT EXISTS pix_key TEXT;

COMMENT ON COLUMN public.salons.pix_key IS 'Chave PIX do salão (CPF, CNPJ, Email, Telefone ou Chave Aleatória)';
