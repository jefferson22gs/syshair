-- Progresso do treinamento (tours, artigos, primeiros passos) por usuário e salão.
-- Multi-tenant: cada usuário só enxerga/grava o próprio progresso em salões aos quais pertence.

CREATE TABLE IF NOT EXISTS public.user_training_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL CHECK (char_length(item_key) BETWEEN 1 AND 100),
  item_version INTEGER NOT NULL DEFAULT 1 CHECK (item_version >= 1),
  kind TEXT NOT NULL CHECK (kind IN ('tour', 'article', 'first_steps', 'welcome')),
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'skipped', 'viewed')),
  current_step INTEGER NOT NULL DEFAULT 0 CHECK (current_step >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, salon_id, item_key, item_version)
);

CREATE INDEX IF NOT EXISTS idx_user_training_progress_user_salon
  ON public.user_training_progress (user_id, salon_id);

DROP TRIGGER IF EXISTS update_user_training_progress_updated_at ON public.user_training_progress;
CREATE TRIGGER update_user_training_progress_updated_at
  BEFORE UPDATE ON public.user_training_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.user_training_progress ENABLE ROW LEVEL SECURITY;

-- Usuário pertence ao salão: dono ou papel vinculado ao salão.
CREATE OR REPLACE FUNCTION public.user_belongs_to_salon(p_salon_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.salons s WHERE s.id = p_salon_id AND s.owner_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.salon_id = p_salon_id AND r.user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.user_belongs_to_salon(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_salon(UUID) TO authenticated;

DROP POLICY IF EXISTS training_progress_select_own ON public.user_training_progress;
CREATE POLICY training_progress_select_own ON public.user_training_progress
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.user_belongs_to_salon(salon_id));

DROP POLICY IF EXISTS training_progress_insert_own ON public.user_training_progress;
CREATE POLICY training_progress_insert_own ON public.user_training_progress
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.user_belongs_to_salon(salon_id));

DROP POLICY IF EXISTS training_progress_update_own ON public.user_training_progress;
CREATE POLICY training_progress_update_own ON public.user_training_progress
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.user_belongs_to_salon(salon_id))
  WITH CHECK (user_id = auth.uid() AND public.user_belongs_to_salon(salon_id));

REVOKE ALL ON public.user_training_progress FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.user_training_progress TO authenticated;
