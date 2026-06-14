
-- Storage RLS policies for company-assets (anon read, authenticated write)
CREATE POLICY "Public read company-assets" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated upload company-assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-assets');

CREATE POLICY "Authenticated update company-assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'company-assets');

CREATE POLICY "Authenticated delete company-assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'company-assets');

-- briefing-files: authenticated only
CREATE POLICY "Auth read briefing-files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'briefing-files');

CREATE POLICY "Auth write briefing-files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'briefing-files');

CREATE POLICY "Auth update briefing-files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'briefing-files');

CREATE POLICY "Auth delete briefing-files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'briefing-files');

-- Fix broken Unsplash image for Cartão de Visita
UPDATE public.services
SET image_url = 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&q=80'
WHERE image_url = 'https://images.unsplash.com/photo-1606293459209-baeca0a90a0e?w=800&q=80';
