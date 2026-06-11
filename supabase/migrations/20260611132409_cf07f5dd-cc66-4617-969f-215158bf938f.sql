
CREATE POLICY "arquivos_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'arquivos');
CREATE POLICY "arquivos_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'arquivos');
CREATE POLICY "arquivos_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'arquivos');
CREATE POLICY "arquivos_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'arquivos');
