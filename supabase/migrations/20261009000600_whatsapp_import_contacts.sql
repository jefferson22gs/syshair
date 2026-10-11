BEGIN;
-- Importação serializada por salão. Clientes legados são preservados; variantes básicas também são comparadas.
CREATE OR REPLACE FUNCTION public.whatsapp_import_contacts(p_salon_id uuid,p_contacts jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE r record; v_id uuid; v_count integer:=0; v_existing integer:=0; v_digits text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM salons WHERE id=p_salon_id AND owner_id=auth.uid()) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_contacts)<>'array' OR jsonb_array_length(p_contacts) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'invalid_contacts'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('contact-import:'||p_salon_id::text,0));
 FOR r IN SELECT DISTINCT ON(phone) phone,name,email FROM jsonb_to_recordset(p_contacts) AS x(phone text,name text,email text) ORDER BY phone LOOP
  IF r.phone !~ '^\+[1-9][0-9]{6,14}$' OR length(coalesce(r.name,'')) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'invalid_contact'; END IF;
  v_digits:=substring(r.phone FROM 2);
  SELECT id INTO v_id FROM clients WHERE salon_id=p_salon_id AND (
   phone_normalized=r.phone OR regexp_replace(coalesce(phone,''),'[^0-9]','','g')=v_digits OR
   (left(v_digits,2)='55' AND length(v_digits) IN(12,13) AND regexp_replace(coalesce(phone,''),'[^0-9]','','g')=substring(v_digits FROM 3))
  ) ORDER BY created_at LIMIT 1;
  IF v_id IS NOT NULL THEN
   UPDATE clients SET phone_normalized=r.phone WHERE id=v_id AND phone_normalized IS NULL;
   v_existing:=v_existing+1;
  ELSE
   INSERT INTO clients(salon_id,name,phone,phone_normalized,email)
   VALUES(p_salon_id,r.name,r.phone,r.phone,nullif(r.email,''));
   v_count:=v_count+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('imported',v_count,'existing',v_existing);
END $$;
REVOKE ALL ON FUNCTION public.whatsapp_import_contacts(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.whatsapp_import_contacts(uuid,jsonb) TO authenticated;
-- Consentimento marketing continua NULL após importação. Não é inferido de um número disponível.
COMMIT;
