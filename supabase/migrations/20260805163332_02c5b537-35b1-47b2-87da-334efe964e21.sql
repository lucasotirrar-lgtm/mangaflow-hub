CREATE POLICY "Site images readable" ON storage.objects
FOR SELECT USING (bucket_id = 'site-images');

CREATE POLICY "Admins upload site images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update site images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete site images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'site-images' AND public.has_role(auth.uid(), 'admin'));