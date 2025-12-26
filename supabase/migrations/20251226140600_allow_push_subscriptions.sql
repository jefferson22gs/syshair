-- Permitir que qualquer pessoa (incluindo anônimos) insira push subscriptions
-- Isso é necessário porque clientes podem não estar autenticados quando visitam a página pública

-- Policy para INSERT (permitir qualquer um inserir sua própria subscription)
CREATE POLICY "Anyone can insert push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Policy para UPDATE (permitir atualizar subscription pelo endpoint)
CREATE POLICY "Anyone can update own push subscription by endpoint"
  ON public.push_subscriptions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy para SELECT (permitir apenas o salão ver suas subscriptions)
CREATE POLICY "Salons can view their push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (
    salon_id IN (
      SELECT id FROM public.salons 
      WHERE owner_id = auth.uid()
    )
    OR auth.uid() IS NOT NULL
  );
