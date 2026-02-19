-- Migration: Add Groq to allowed AI providers
-- Author: Antigravity Agent
-- Description: Updates the check constraint on chatbot_settings to allow 'groq' provider

-- Primeiro remover a constraint existente
ALTER TABLE public.chatbot_settings 
DROP CONSTRAINT IF EXISTS chatbot_settings_ai_provider_check;

-- Recriar a constraint com 'groq' adicionado na lista
ALTER TABLE public.chatbot_settings 
ADD CONSTRAINT chatbot_settings_ai_provider_check 
CHECK (ai_provider IN ('openai', 'gemini', 'grok', 'perplexity', 'groq'));
