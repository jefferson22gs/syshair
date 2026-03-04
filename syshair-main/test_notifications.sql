-- Verificar se a tabela existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'admin_notifications'
);

-- Contar notificações
SELECT COUNT(*) as total_notifications FROM admin_notifications;

-- Ver últimas notificações
SELECT id, type, title, message, read, created_at 
FROM admin_notifications 
ORDER BY created_at DESC 
LIMIT 5;

-- Verificar triggers
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'appointments';
