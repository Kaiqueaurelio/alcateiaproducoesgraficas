UPDATE public.company_settings
SET
  whatsapp = '+55 11 97223-5342',
  address = 'Estrada do Cabreúva, 703 — Vila Santa Lúcia, Carapicuíba - SP, CEP 06321-001',
  instagram = '@alcateiasproducoesgraficas',
  default_quote_text = COALESCE(default_quote_text,
    'Orçamento Alcateia''s Produções Gráficas. Validade: 7 dias. Pagamento: 50% antecipado, 50% na retirada/entrega. PIX, débito ou crédito.'),
  default_order_text = COALESCE(default_order_text,
    'Ao aprovar a arte, o cliente declara estar de acordo com cores, textos e layout. Após aprovação não há devolução por erro de digitação ou cor visualizada em tela.'),
  updated_at = now()
WHERE id IS NOT NULL;