-- ============================================================================
--  Storage buckets. product-files is PRIVATE with no read policy at all — every
--  download goes through a server route that mints a 60-second signed URL with
--  the service-role key. product-previews is public for covers + sample pages.
--  The existing `homework` bucket is untouched.
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('product-files', 'product-files', false, 2147483648)  -- 2GB, PRIVATE
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('product-previews', 'product-previews', true, 10485760) -- 10MB, public
on conflict (id) do nothing;

-- product-files: staff only. No anon/authenticated read policy by design.
create policy "staff manage product files" on storage.objects for all to authenticated
  using      (bucket_id = 'product-files' and public.is_staff())
  with check (bucket_id = 'product-files' and public.is_staff());

create policy "public read previews" on storage.objects for select
  using (bucket_id = 'product-previews');
create policy "staff manage previews" on storage.objects for all to authenticated
  using      (bucket_id = 'product-previews' and public.is_staff())
  with check (bucket_id = 'product-previews' and public.is_staff());
