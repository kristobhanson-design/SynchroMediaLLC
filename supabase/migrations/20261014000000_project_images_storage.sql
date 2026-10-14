-- Supabase Storage bucket for admin-uploaded project images, replacing
-- local disk storage on SiteGround (php/uploads/, soon
-- src/app/api/upload/route.ts) — see src/lib/images.ts's STORAGE_BUCKET
-- comment for why local disk isn't trustworthy under SiteGround's Node.js
-- Project model. Part of docs/NODE_MIGRATION.md.
--
-- Same public-read / admin-write shape as every other table in this
-- schema (supabase/migrations/20260820163901_rls_policies.sql): public.is_admin()
-- gates every write, and reads are open because this is public marketing
-- content, not anything sensitive.

insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

create policy project_images_public_read on storage.objects
  for select to public
  using (bucket_id = 'project-images');

create policy project_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-images' and public.is_admin());

create policy project_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'project-images' and public.is_admin())
  with check (bucket_id = 'project-images' and public.is_admin());

create policy project_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'project-images' and public.is_admin());
