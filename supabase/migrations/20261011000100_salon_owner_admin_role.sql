-- Donos têm duas linhas em user_roles (client sem salão + admin). LIMIT 1 sem ordem
-- podia devolver NULL e esconder salão/clientes/profissionais via RLS.
-- O papel admin do dono é concedido pelo trigger da migration 20261009000100.

CREATE OR REPLACE FUNCTION public.get_user_salon_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT salon_id FROM (
    SELECT s.id AS salon_id, 0 AS prio, s.created_at AS ts
      FROM public.salons s WHERE s.owner_id = _user_id
    UNION ALL
    SELECT ur.salon_id, CASE ur.role WHEN 'admin' THEN 1 WHEN 'professional' THEN 2 ELSE 3 END, NULL
      FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.salon_id IS NOT NULL
  ) x
  ORDER BY prio, ts NULLS LAST
  LIMIT 1
$$;

INSERT INTO public.user_roles (user_id, role, salon_id)
SELECT s.owner_id, 'admin', s.id FROM public.salons s
WHERE s.owner_id IS NOT NULL
ON CONFLICT (user_id, role, salon_id) DO NOTHING;
