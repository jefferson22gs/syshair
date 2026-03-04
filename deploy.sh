#!/bin/bash
# =====================================================
# SCRIPT DE DEPLOY COMPLETO - SYSHAIR
# Execute este script para fazer deploy de tudo
# =====================================================

echo "🚀 Iniciando deploy completo do SysHair..."
echo ""

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
PROJECT_REF="jfjbpjnnfnuiezchhust"
SUPABASE_URL="https://jfjbpjnnfnuiezchhust.supabase.co"

echo -e "${BLUE}📋 Checklist de Deploy${NC}"
echo "================================"
echo ""

# 1. Verificar se Supabase CLI está instalado
echo -e "${YELLOW}1. Verificando Supabase CLI...${NC}"
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✅ Supabase CLI instalado${NC}"
    supabase --version
else
    echo -e "${RED}❌ Supabase CLI não instalado${NC}"
    echo ""
    echo "Para instalar, execute:"
    echo ""
    echo "Windows (PowerShell como Admin):"
    echo "  scoop bucket add supabase https://github.com/supabase/scoop-bucket.git"
    echo "  scoop install supabase"
    echo ""
    echo "Ou baixe direto:"
    echo "  https://github.com/supabase/cli/releases"
    echo ""
    exit 1
fi

echo ""

# 2. Login no Supabase
echo -e "${YELLOW}2. Fazendo login no Supabase...${NC}"
supabase login

echo ""

# 3. Link com o projeto
echo -e "${YELLOW}3. Conectando ao projeto...${NC}"
cd "J:\AREA DE TRABALHO\Projetos\SysHair\syshair-main"
supabase link --project-ref $PROJECT_REF

echo ""

# 4. Executar migrations
echo -e "${YELLOW}4. Executando migrations SQL...${NC}"
echo ""
echo "⚠️  IMPORTANTE: Execute as migrations manualmente no SQL Editor:"
echo "   ${SUPABASE_URL}/project/${PROJECT_REF}/sql"
echo ""
echo "Ordem de execução:"
echo "  1. 20260304_fix_broadcast_system.sql"
echo "  2. 20260304_appointment_modification_system.sql"
echo "  3. 20260304_push_notifications_system.sql"
echo "  4. 20260304_google_calendar_integration.sql"
echo "  5. 20260304_auto_status_whatsapp.sql"
echo "  6. 20260304_pwa_personalized_system.sql"
echo "  7. 20260304_improved_schedule_view.sql"
echo "  8. 20260304_setup_cron_jobs.sql"
echo ""
read -p "Pressione ENTER após executar todas as migrations..."

echo ""

# 5. Deploy Edge Functions
echo -e "${YELLOW}5. Fazendo deploy das Edge Functions...${NC}"
echo ""

echo "📤 Deploying broadcast-messages-v2..."
supabase functions deploy broadcast-messages-v2 --no-verify-jwt

echo "📤 Deploying broadcast-queue-worker..."
supabase functions deploy broadcast-queue-worker --no-verify-jwt

echo "📤 Deploying send-push-notification..."
supabase functions deploy send-push-notification --no-verify-jwt

echo "📤 Deploying auto-post-status..."
supabase functions deploy auto-post-status --no-verify-jwt

echo ""

# 6. Configurar variáveis de ambiente
echo -e "${YELLOW}6. Configurando variáveis de ambiente...${NC}"
echo ""
echo "Configure as seguintes variáveis no dashboard:"
echo "  ${SUPABASE_URL}/project/${PROJECT_REF}/settings/functions"
echo ""
echo "Variáveis necessárias:"
echo "  EVOLUTION_API_URL=https://api.tubaraoemprestimo.com.br"
echo "  EVOLUTION_API_KEY=B8959800-F546-407C-99E8-C40306E747F5"
echo ""
read -p "Pressione ENTER após configurar as variáveis..."

echo ""

# 7. Verificar cron jobs
echo -e "${YELLOW}7. Verificando cron jobs...${NC}"
echo ""
echo "Execute no SQL Editor para verificar:"
echo "  SELECT * FROM cron.job ORDER BY jobid;"
echo ""

# 8. Teste
echo -e "${YELLOW}8. Executando testes...${NC}"
echo ""
echo "Execute os seguintes testes:"
echo ""
echo "Teste 1 - Verificar queue:"
echo "  SELECT status, COUNT(*) FROM broadcast_queue GROUP BY status;"
echo ""
echo "Teste 2 - Processar queue manualmente:"
echo "  SELECT net.http_post("
echo "    url := '${SUPABASE_URL}/functions/v1/broadcast-queue-worker',"
echo "    headers := '{\"Content-Type\": \"application/json\"}'::jsonb,"
echo "    body := '{}'::jsonb"
echo "  );"
echo ""

echo ""
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo ""
echo "📚 Documentação:"
echo "  - GUIA_IMPLEMENTACAO_COMPLETO.md"
echo "  - COMANDOS_RAPIDOS.md"
echo "  - RESUMO_EXECUTIVO_FINAL.md"
echo ""
echo "🎉 Sistema pronto para uso!"
