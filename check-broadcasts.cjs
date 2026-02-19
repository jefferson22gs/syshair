// Script para verificar status dos broadcasts no banco (CommonJS)
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jfjbpjnnfnuiezchhust.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmamJwam5uZm51aWV6Y2hodXN0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU5MjkxOSwiZXhwIjoyMDgyMTY4OTE5fQ.QPkCzpjkCdKrUO361ZqwY1_zqyMZRI0dbPLV8Uqqhd0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkBroadcasts() {
  console.log('=== VERIFICANDO BROADCASTS ===\n');

  // Buscar broadcasts recentes
  const { data: broadcasts, error: broadcastError } = await supabase
    .from('broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (broadcastError) {
    console.error('Erro ao buscar broadcasts:', broadcastError);
    return;
  }

  console.log(`Encontrados ${broadcasts?.length || 0} broadcasts recentes:\n`);

  for (const bc of broadcasts || []) {
    console.log('---');
    console.log(`ID: ${bc.id}`);
    console.log(`Salon: ${bc.salon_id}`);
    console.log(`Status: ${bc.status}`);
    console.log(`Mensagem: ${bc.message?.substring(0, 50)}...`);
    console.log(`Total: ${bc.total_recipients} | Enviados: ${bc.sent_count || 0} | Falhas: ${bc.failed_count || 0}`);
    console.log(`Criado: ${bc.created_at}`);
    console.log(`Concluído: ${bc.completed_at || 'N/A'}`);
    if (bc.error_message) {
      console.log(`Erro: ${bc.error_message}`);
    }
    console.log('');

    // Buscar mensagens deste broadcast
    const { data: messages } = await supabase
      .from('broadcast_messages')
      .select('phone, status, error_message, created_at')
      .eq('broadcast_id', bc.id)
      .order('created_at', { ascending: true })
      .limit(10);

    if (messages && messages.length > 0) {
      console.log(`Últimas ${messages.length} mensagens:`);
      for (const msg of messages) {
        const statusIcon = msg.status === 'sent' ? '✓' : '✗';
        console.log(`  ${statusIcon} ${msg.phone} | Status: ${msg.status}`);
        if (msg.error_message) {
          console.log(`     Erro: ${msg.error_message.substring(0, 100)}`);
        }
      }
      console.log('');
    }
  }

  // Contagem por status
  const { data: sent, count: sentCount } = await supabase
    .from('broadcast_messages')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent');

  const { data: failed, count: failedCount } = await supabase
    .from('broadcast_messages')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  console.log('=== RESUMO ===');
  console.log(`Total enviados: ${sentCount || 0}`);
  console.log(`Total falhas: ${failedCount || 0}`);
}

checkBroadcasts().catch(console.error);
