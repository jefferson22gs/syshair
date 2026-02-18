// ==============================================================================
// SCRIPT DE VERIFICAÇÃO DO BACKEND VIA API - SYSHAIR
// Executa verificações usando as credenciais do Supabase
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jfjbpjnnfnuiezchhust.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmamJwam5uZm51aWV6Y2hodXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTI5MTksImV4cCI6MjA4MjE2ODkxOX0.hBIcT4HOxX04qs1Rl6wcPD57kWrmBEyokqgeMV601o0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('========================================');
console.log('VERIFICAÇÃO DO BACKEND - SYSHAIR');
console.log('Data:', new Date().toLocaleString('pt-BR'));
console.log('========================================\n');

async function verify() {
    let allChecks = [];

    // 1. Verificar conexão
    console.log('1. Testando conexão com Supabase...');
    try {
        const { error } = await supabase.from('salons').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Conexão OK\n');
        allChecks.push({ name: 'Conexão', status: 'OK' });
    } catch (error) {
        console.error('❌ Erro de conexão:', error.message);
        allChecks.push({ name: 'Conexão', status: 'ERRO', error: error.message });
        return;
    }

    // 2. Verificar tabela salons e coluna pix_key
    console.log('2. Verificando tabela salons...');
    try {
        const { data: salons, error } = await supabase
            .from('salons')
            .select('id, name, slug, pix_key, logo_url, theme_color, owner_email')
            .limit(10);

        if (error) throw error;

        console.log(`✅ Total de salões encontrados: ${salons.length}`);

        const withPix = salons.filter(s => s.pix_key).length;
        console.log(`   - Salões com PIX configurado: ${withPix}`);

        const withLogo = salons.filter(s => s.logo_url).length;
        console.log(`   - Salões com logo: ${withLogo}`);

        const withEmail = salons.filter(s => s.owner_email).length;
        console.log(`   - Salões com email: ${withEmail}\n`);

        allChecks.push({ name: 'Tabela salons', status: 'OK', count: salons.length });

        if (salons.length > 0) {
            console.log('Exemplo de salão:');
            const example = {
                name: salons[0].name,
                slug: salons[0].slug,
                has_pix: !!salons[0].pix_key,
                has_logo: !!salons[0].logo_url
            };
            console.log(JSON.stringify(example, null, 2));
            console.log('');
        }
    } catch (error) {
        console.error('❌ Erro ao verificar salons:', error.message);
        allChecks.push({ name: 'Tabela salons', status: 'ERRO', error: error.message });
    }

    // 3. Verificar tabela service_packages
    console.log('3. Verificando tabela service_packages...');
    try {
        const { count, error } = await supabase
            .from('service_packages')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        console.log(`✅ Total de pacotes: ${count || 0}\n`);
        allChecks.push({ name: 'Tabela service_packages', status: 'OK', count: count || 0 });
    } catch (error) {
        console.error('❌ Erro ao verificar service_packages:', error.message);
        allChecks.push({ name: 'Tabela service_packages', status: 'ERRO', error: error.message });
    }

    // 4. Verificar tabela service_package_items
    console.log('4. Verificando tabela service_package_items...');
    try {
        const { count, error } = await supabase
            .from('service_package_items')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        console.log(`✅ Total de itens de pacotes: ${count || 0}\n`);
        allChecks.push({ name: 'Tabela service_package_items', status: 'OK', count: count || 0 });
    } catch (error) {
        console.error('❌ Erro ao verificar service_package_items:', error.message);
        allChecks.push({ name: 'Tabela service_package_items', status: 'ERRO', error: error.message });
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
            broadcasts.forEach((b, i) => {
                const successRate = b.total_recipients > 0
                    ? ((b.sent_count / b.total_recipients) * 100).toFixed(1)
                    : 0;
                console.log(`  ${i + 1}. Status: ${b.status}, Enviados: ${b.sent_count}/${b.total_recipients} (${successRate}%)`);
            });
        }
        console.log('');
        allChecks.push({ name: 'Tabela broadcasts', status: 'OK', count: broadcasts.length });
    } catch (error) {
        console.error('❌ Erro ao verificar broadcasts:', error.message);
        allChecks.push({ name: 'Tabela broadcasts', status: 'ERRO', error: error.message });
    }

    // 6. Verificar tabela broadcast_messages
    console.log('6. Verificando tabela broadcast_messages...');
    try {
        const { count, error } = await supabase
            .from('broadcast_messages')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        console.log(`✅ Total de mensagens de broadcast: ${count || 0}\n`);
        allChecks.push({ name: 'Tabela broadcast_messages', status: 'OK', count: count || 0 });
    } catch (error) {
        console.error('❌ Erro ao verificar broadcast_messages:', error.message);
        allChecks.push({ name: 'Tabela broadcast_messages', status: 'ERRO', error: error.message });
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
            console.log('   Configure no Super Admin para usar "Melhorar com IA"');
        }
        console.log('');
        allChecks.push({ name: 'Tabela ai_provider_keys', status: 'OK', count: keys.length });
    } catch (error) {
        console.error('❌ Erro ao verificar ai_provider_keys:', error.message);
        allChecks.push({ name: 'Tabela ai_provider_keys', status: 'ERRO', error: error.message });
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
            console.log(`   - Criado em: ${new Date(galleryBucket.created_at).toLocaleString('pt-BR')}`);
            allChecks.push({ name: 'Storage bucket gallery', status: 'OK' });
        } else {
            console.error('❌ Bucket gallery NÃO encontrado');
            console.log('   Execute o script EXECUTE_NO_SUPABASE.sql para criar');
            allChecks.push({ name: 'Storage bucket gallery', status: 'NÃO ENCONTRADO' });
        }
        console.log('');
    } catch (error) {
        console.error('❌ Erro ao verificar storage:', error.message);
        allChecks.push({ name: 'Storage bucket gallery', status: 'ERRO', error: error.message });
    }

    // 9. Resumo Final
    console.log('========================================');
    console.log('RESUMO DA VERIFICAÇÃO');
    console.log('========================================');

    const okCount = allChecks.filter(c => c.status === 'OK').length;
    const errorCount = allChecks.filter(c => c.status === 'ERRO').length;
    const warningCount = allChecks.filter(c => c.status === 'NÃO ENCONTRADO').length;

    allChecks.forEach(check => {
        const icon = check.status === 'OK' ? '✅' : check.status === 'ERRO' ? '❌' : '⚠️';
        const countInfo = check.count !== undefined ? ` (${check.count})` : '';
        console.log(`${icon} ${check.name}${countInfo}`);
    });

    console.log('========================================');
    console.log(`Total: ${okCount} OK, ${errorCount} Erros, ${warningCount} Avisos`);
    console.log('========================================\n');

    if (errorCount === 0 && warningCount === 0) {
        console.log('✅ VERIFICAÇÃO CONCLUÍDA COM SUCESSO!\n');
    } else if (errorCount > 0) {
        console.log('❌ VERIFICAÇÃO CONCLUÍDA COM ERROS!\n');
    } else {
        console.log('⚠️  VERIFICAÇÃO CONCLUÍDA COM AVISOS!\n');
    }

    console.log('Próximos passos:');
    console.log('1. Execute o script EXECUTE_NO_SUPABASE.sql no Supabase SQL Editor');
    console.log('   URL: https://supabase.com/dashboard/project/jfjbpjnnfnuiezchhust/sql');
    console.log('2. Configure uma API key de IA no Super Admin');
    console.log('   URL: https://syshair.vercel.app/super-admin');
    console.log('3. Teste upload de logo em Configurações');
    console.log('4. Teste criar pacote com múltiplos serviços');
    console.log('5. Teste disparo WhatsApp');
    console.log('========================================\n');
}

verify().catch(console.error);
