-- =============================================
-- SYSHAIR - CRON JOB PARA POSTS AGENDADOS
-- Executa a cada 5 minutos para verificar posts pendentes
-- =============================================

-- Habilitar a extensão pg_cron (se não estiver habilitada)
-- NOTA: pg_cron precisa ser habilitado manualmente no Dashboard do Supabase
-- Vá em Database > Extensions e habilite "pg_cron"

-- Criar função para chamar a Edge Function via HTTP
CREATE OR REPLACE FUNCTION public.trigger_scheduled_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_url TEXT;
    v_response JSONB;
BEGIN
    -- URL da Edge Function
    v_url := 'https://jfjbpjnnfnuiezchhust.supabase.co/functions/v1/process-scheduled-posts';
    
    -- Chamar a Edge Function usando pg_net (extensão HTTP)
    -- NOTA: A extensão pg_net precisa estar habilitada
    PERFORM net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
    );
    
    RAISE NOTICE 'Scheduled posts trigger executed at %', now();
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error triggering scheduled posts: %', SQLERRM;
END;
$$;

-- Criar job no pg_cron para executar a cada 5 minutos
-- NOTA: Execute isso manualmente após habilitar pg_cron
-- SELECT cron.schedule(
--     'process-scheduled-posts',  -- nome do job
--     '*/5 * * * *',              -- a cada 5 minutos
--     $$SELECT public.trigger_scheduled_posts()$$
-- );

-- Alternativa: Usar pg_cron para verificar posts diretamente no banco
-- e chamar a Edge Function via webhook configurado no Supabase

-- Função alternativa que processa diretamente (sem chamar Edge Function)
CREATE OR REPLACE FUNCTION public.check_and_process_scheduled_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_post RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Buscar posts que precisam ser publicados
    FOR v_post IN
        SELECT id, salon_id, content_type, text_content, media_url
        FROM scheduled_posts
        WHERE status = 'scheduled'
        AND scheduled_at <= now()
        LIMIT 10  -- Processar no máximo 10 por vez
    LOOP
        -- Marcar como processando
        UPDATE scheduled_posts
        SET status = 'processing'
        WHERE id = v_post.id;
        
        v_count := v_count + 1;
        
        -- A lógica de envio para WhatsApp será feita pela Edge Function
        -- Este cron apenas marca os posts para processamento
    END LOOP;
    
    IF v_count > 0 THEN
        RAISE NOTICE 'Marked % posts for processing at %', v_count, now();
    END IF;
END;
$$;

-- Comentário sobre configuração do Cron
COMMENT ON FUNCTION public.trigger_scheduled_posts() IS 
'Função que dispara o processamento de posts agendados. 
Configure o cron com: SELECT cron.schedule(''process-posts'', ''*/5 * * * *'', $$SELECT public.trigger_scheduled_posts()$$);';
