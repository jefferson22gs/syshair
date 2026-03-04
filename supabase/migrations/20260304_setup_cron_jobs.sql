-- =====================================================
-- CONFIGURAÇÃO DE CRON JOBS PARA AUTOMAÇÕES
-- Agenda execuções automáticas de tarefas
-- =====================================================

-- 1. Cron para processar queue de broadcast (a cada 1 minuto)
SELECT cron.schedule(
    'process-broadcast-queue',
    '* * * * *', -- A cada minuto
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/broadcast-queue-worker',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 2. Cron para mensagens de aniversário (todo dia às 9h)
SELECT cron.schedule(
    'birthday-messages-daily',
    '0 9 * * *', -- 9h da manhã todo dia
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/auto-birthday-messages',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 3. Cron para auto-post de status WhatsApp (a cada hora)
SELECT cron.schedule(
    'auto-post-status-hourly',
    '0 * * * *', -- A cada hora
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/auto-post-status',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 4. Cron para sincronizar Google Calendar (a cada 15 minutos)
SELECT cron.schedule(
    'sync-google-calendar',
    '*/15 * * * *', -- A cada 15 minutos
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/sync-google-calendar',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 5. Cron para limpar queue antiga (todo dia às 3h)
SELECT cron.schedule(
    'cleanup-old-queue',
    '0 3 * * *', -- 3h da manhã todo dia
    $$
    SELECT cleanup_old_broadcast_queue();
    $$
);

-- 6. Cron para verificar broadcasts travados (a cada 5 minutos)
SELECT cron.schedule(
    'check-stalled-broadcasts',
    '*/5 * * * *', -- A cada 5 minutos
    $$
    UPDATE broadcasts
    SET status = 'failed',
        error_message = 'Broadcast travado - sem atividade por mais de 30 minutos',
        completed_at = NOW()
    WHERE status = 'processing'
      AND last_activity_at < NOW() - INTERVAL '30 minutes';
    $$
);

-- 7. Cron para processar notificações pendentes (a cada 2 minutos)
SELECT cron.schedule(
    'process-pending-notifications',
    '*/2 * * * *', -- A cada 2 minutos
    $$
    SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/process-notifications',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 8. Comentários
COMMENT ON EXTENSION pg_cron IS 'Agendador de tarefas para automações do sistema';

-- =====================================================
-- SUCESSO! Cron jobs configurados
-- =====================================================

SELECT 'Cron jobs configurados com sucesso!' as message;

-- Listar todos os cron jobs
SELECT
    jobid,
    schedule,
    command,
    nodename,
    nodeport,
    database,
    username,
    active
FROM cron.job
ORDER BY jobid;
