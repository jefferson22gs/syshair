BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('whatsapp-media','whatsapp-media',false,16777216,ARRAY['image/jpeg','image/png','image/webp','video/mp4','application/pdf'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=EXCLUDED.file_size_limit,allowed_mime_types=EXCLUDED.allowed_mime_types;
CREATE POLICY "Salon admins read whatsapp media" ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='whatsapp-media' AND EXISTS(SELECT 1 FROM public.salons s WHERE s.id::text=(storage.foldername(name))[1] AND s.owner_id=auth.uid()));
CREATE POLICY "Salon admins upload whatsapp media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK(bucket_id='whatsapp-media' AND EXISTS(SELECT 1 FROM public.salons s WHERE s.id::text=(storage.foldername(name))[1] AND s.owner_id=auth.uid()));
-- Sem UPDATE: objetos são imutáveis (UUID por upload); somente worker limpa órfãos após verificar uso.
-- Bucket legado status-media permanece inalterado para não quebrar publicações antigas.
COMMIT;
