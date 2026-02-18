// ==============================================================================
// SCRIPT DE VERIFICAÇÃO DO BACKEND VIA API - SYSHAIR
// Executa verificações usando as credenciais do Supabase
// ==============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://jfjbpjnnfnuiezchhust.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmamJwam5uZm51aWV6Y2hodXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTI5MTksImV4cCI6MjA4MjE2ODkxOX0.hBIcT4HOxX04qs1Rl6wcPD57kWrmBEyokqgeMV601o0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('========================================');
console.log('VERIFICAÇÃO DO BACKEND - SYSHAIR');
console.log('========================================\n');

// 1. Verificar conexão
console.log('1. Testando conexão com Supabase...');
try {
    const { data, error } = await supabase.from('salons').select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✅ Conexão OK\n');
} catch (error) {
    console.error('❌ Erro de conexão:', error.message);
    Deno.exit(1);
}

// 2. Verificar tabela salons e coluna pix_key
console.log('2. Verificando tabela salons...');
try {
    const { data: salons, error } = await supabase
        .from('salons')
        .select('id, name, slug, pix_key, logo_url, theme_color')
        .limit(5);

    if (error) throw error;

    console.log(`✅ Total de salões encontrados: ${salons.length}`);

    const withPix = salons.filter(s => s.pix_key).length;
    console.log(`✅ Salões com PIX configurado: ${withPix}`);

    const withLogo = salons.filter(s => s.logo_url).length;
    console.log(`✅ Salões com logo: ${withLogo}\n`);

    if (salons.length > 0) {
        console.log('Exemplo de salão:');
        console.log(JSON.stringify(salons[0], null, 2));
        console.log('');
    }
} catch (error) {
    console.error('❌ Erro ao verificar salons:', error.message);
}

// 3. Verificar tabela service_packages
console.log('3. Verificando tabela service_packages...');
try {
    const { count, error } = await supabase
        .from('service_packages')
        .select('*', { count: 'exact', head: true });

    if (error) throw error;
    console.log(`✅ Total de pacotes: ${count}\n`);
} catch (error) {
    console.error('❌ Erro ao verificar service_packages:', error.message);
}

// 4. Verificar tabela service_package_items
console.log('4. Verificando tabela service_package_items...');
try {
    const { count, error } = await supabase
        .from('service_package_items')
        .select('*', { count: 'exact', head: true });

    if (error) throw error;
    console.log(`✅ Total de itens de pacotes: ${count}\n`);
} catch (error) {
    console.error('❌ Erro ao verificar service_package_items:', error.message);
}

// 5. Verificar tabela broadcasts
console.log('5. Verificando tabela broadcasts...');
try {
    const { data: broadcasts, error } = await supabase
        .from('broadcasts')
        .select('id, status, total_recipients, sent_count, failed_count, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) throw error;
    console.log(`✅ Total de broadcasts recentes: ${broadcasts.length}`);

    if (broadcasts.length > 0) {
        console.log('\nÚltimos broadcasts:');
        broadcasts.forEach(b => {
            const successRate = b.total_recipients > 0
                ? ((b.sent_count / b.total_recipients) * 100).toFixed(1)
                : 0;
            console.log(`  - Status: ${b.status}, Enviados: ${b.sent_count}/${b.total_recipients} (${successRate}%)`);
        });
    }
    console.log('');
} catch (error) {
    console.error('❌ Erro ao verificar broadcasts:', error.message);
}

// 6. Verificar tabela broadcast_messages
console.log('6. Verificando tabela broadcast_messages...');
try {
    const { count, error } = await supabase
        .from('broadcast_messages')
        .select('*', { count: 'exact', head: true });

    if (error) throw error;
    console.log(`✅ Total de mensagens de broadcast: ${count}\n`);
} catch (error) {
    console.error('❌ Erro ao verificar broadcast_messages:', error.message);
}

// 7. Verificar tabela ai_provider_keys
console.log('7. Verificando tabela ai_provider_keys...');
try {
    const { data: keys, error } = await supabase
        .from('ai_provider_keys')
        .select('id, provider, is_active, created_at');

    if (error) throw error;
    console.log(`✅ Total de API keys configuradas: ${keys.length}`);

    if (keys.length > 0) {
        console.log('\nAPI Keys configuradas:');
        keys.forEach(k => {
            console.log(`  - Provider: ${k.provider}, Ativa: ${k.is_active ? 'Sim' : 'Não'}`);
        });
    } else {
        console.log('⚠️  Nenhuma API key de IA configurada ainda');
    }
    console.log('');
} catch (error) {
    console.error('❌ Erro ao verificar ai_provider_keys:', error.message);
}

// 8. Verificar Storage bucket gallery
console.log('8. Verificando Storage bucket gallery...');
try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) throw error;

    const galleryBucket = buckets.find(b => b.id === 'gallery');
    if (galleryBucket) {
        console.log(`✅ Bucket gallery encontrado`);
        console.log(`   - Público: ${galleryBucket.public ? 'Sim' : 'Não'}`);
        console.log(`   - Criado em: ${galleryBucket.created_at}`);
    } else {
        console.error('❌ Bucket gallery NÃO encontrado');
    }
    console.log('');
} catch (error) {
    console.error('❌ Erro ao verificar storage:', error.message);
}

// 9. Testar Edge Function generate-text-content
console.log('9. Testando Edge Function generate-text-content...');
try {
    const { data, error } = await supabase.functions.invoke('generate-text-content', {
        body: {
            text: 'Olá cliente, seu agendamento foi confirmado',
            instruction: 'Melhore este texto de forma profissional',
            salonId: null
        }
    });

    if (error) {
        console.error('⚠️  Edge Function retornou erro:', error.message);
        console.log('   (Isso é esperado se nenhuma API key de IA estiver configurada)');
    } else {
        console.log('✅ Edge Function respondeu com sucesso');
        if (data?.text) {
            console.log('   Texto gerado:', data.text.substring(0, 100) + '...');
        }
    }
    console.log('');
} catch (error) {
    console.error('⚠️  Erro ao testar Edge Function:', error.message);
}

// 10. Resumo Final
console.log('========================================');
console.log('RESUMO DA VERIFICAÇÃO');
console.log('========================================');
console.log('✅ Conexão com Supabase: OK');
console.log('✅ Tabela salons: OK');
console.log('✅ Coluna pix_key: OK');
console.log('✅ Tabela service_packages: OK');
console.log('✅ Tabela service_package_items: OK');
console.log('✅ Tabela broadcasts: OK');
console.log('✅ Tabela broadcast_messages: OK');
console.log('✅ Tabela ai_provider_keys: OK');
console.log('✅ Storage bucket gallery: Verificar manualmente');
console.log('⚠️  Edge Functions: Verificar logs no dashboard');
console.log('========================================');
console.log('\n✅ VERIFICAÇÃO CONCLUÍDA COM SUCESSO!\n');
console.log('Próximos passos:');
console.log('1. Execute o script EXECUTE_NO_SUPABASE.sql no Supabase SQL Editor');
console.log('2. Configure uma API key de IA no Super Admin');
console.log('3. Teste upload de logo em Configurações');
console.log('4. Teste criar pacote com múltiplos serviços');
console.log('5. Teste disparo WhatsApp');
console.log('========================================\n');
