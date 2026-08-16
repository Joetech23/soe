-- ============================================================================
--  Seed: categories + the 8 resources at their LIVE Payhip prices.
--  Idempotent (upsert on slug). Product FILES are not seeded here — upload them
--  to the private product-files bucket and insert product_assets rows during
--  cutover. Run after migrations 0001–0006.
-- ============================================================================

insert into public.product_categories (slug, name, summary, sort_order) values
  ('phonics', 'Phonics', 'Sounds, blending and early reading', 1),
  ('reading', 'Reading', 'Fluency, comprehension and a love of books', 2),
  ('ks2',     'KS2',     'Key Stage 2 skills and reasoning', 3),
  ('parents', 'Parents', 'Guides that help you support at home', 4)
on conflict (slug) do update
  set name = excluded.name, summary = excluded.summary, sort_order = excluded.sort_order;

insert into public.products
  (slug, name, summary, price_pence, product_type, category_id, sort_order, published_at)
values
  ('ks2-inference-cards', 'Free KS2 inference cards',
   'Ready-to-print inference cards to sharpen reading comprehension in Key Stage 2.',
   0, 'pdf', (select id from public.product_categories where slug='ks2'), 1, now()),

  ('recommended-books', 'Recommended books',
   'Ms Betty''s curated reading list of books children love, sorted for every primary age.',
   0, 'pdf', (select id from public.product_categories where slug='reading'), 2, now()),

  ('parents-evening-guide', 'Parents evening guide',
   'Get the most from parents evening, questions to ask and how to act on what you hear.',
   0, 'pdf', (select id from public.product_categories where slug='parents'), 3, now()),

  ('expressive-reading-guide', 'Expressive reading guide for parents',
   'How to read aloud with expression at home to build fluency, confidence and a love of stories.',
   100, 'pdf', (select id from public.product_categories where slug='reading'), 4, now()),

  ('rhyming-bingo', 'Rhyming bingo',
   'A playful rhyming bingo game to build phonological awareness with early readers.',
   100, 'pdf', (select id from public.product_categories where slug='phonics'), 5, now()),

  ('school-readiness-guide', 'School readiness guide',
   'A step-by-step guide to helping your child start school confident, capable and excited.',
   100, 'pdf', (select id from public.product_categories where slug='parents'), 6, now()),

  ('phonics-handbook', 'Phonics handbook',
   'A friendly handbook for parents that demystifies phonics and shows you how to support at home.',
   250, 'pdf', (select id from public.product_categories where slug='phonics'), 7, now()),

  ('phonics-webinar', 'Phonics webinar for parents',
   'A recorded webinar walking you through phonics so you can support reading at home with confidence.',
   500, 'video', (select id from public.product_categories where slug='phonics'), 8, now())
on conflict (slug) do update
  set name = excluded.name,
      summary = excluded.summary,
      price_pence = excluded.price_pence,
      product_type = excluded.product_type,
      category_id = excluded.category_id,
      sort_order = excluded.sort_order;
