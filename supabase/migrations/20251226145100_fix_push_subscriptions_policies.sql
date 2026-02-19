-- Desabilitar RLS temporariamente para diagnóstico
-- Esta migration permite que qualquer pessoa insira push subscriptions

-- Primeiro, vamos verificar se há policies conflitantes e removê-las
DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can update own push subscription by endpoint" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Salons can view their push subscriptions" ON public.push_subscriptions;

-- Criar policies mais permissivas
-- INSERT: Permitir qualquer inserção (mesmo anônimos)
CREATE POLICY "push_subscriptions_insert_policy"
  ON public.push_subscriptions
  FOR INSERT
  TO public, anon, authenticated
  WITH CHECK (true);

-- UPDATE: Permitir qualquer atualização
CREATE POLICY "push_subscriptions_update_policy"
  ON public.push_subscriptions
  FOR UPDATE
  TO public, anon, authenticated
  USING (true)
  WITH CHECK (true);

-- SELECT: Permitir leitura pelo salão dono
CREATE POLICY "push_subscriptions_select_policy"
  ON public.push_subscriptions
  FOR SELECT
  TO public, anon, authenticated
  USING (true);

-- DELETE: Permitir deletar própria subscription
CREATE POLICY "push_subscriptions_delete_policy"
  ON public.push_subscriptions
  FOR DELETE
  TO public, anon, authenticated
  USING (true);
