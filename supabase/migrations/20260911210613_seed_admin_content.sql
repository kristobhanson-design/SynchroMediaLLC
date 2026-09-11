-- Admin panel — real content seed (PLAN.md §5/§7, this session's admin build).
--
-- The original 2026-08-20 seed (site_content, services) was written before
-- the Atelier Noir rebuild and speculatively covers pages that were never
-- built (a /work, /dealerships, /about route) while missing real copy from
-- sections that DO exist (Bio, the video hero, Portfolio, the social-content
-- block). This migration makes site_content/services match what's actually
-- live in src/components/, verified by reading each component directly
-- rather than trusting the old seed — several old rows also contradicted
-- documented client feedback (e.g. global.service_area still listed the
-- fabricated county list that was explicitly removed per client request).

-- ============================================================ site_content =

-- Stale rows with no live counterpart — speculative pages/sections that
-- were never built, or copy the client explicitly asked removed.
delete from public.site_content where key in (
  'global.phone', 'global.service_area', 'global.instagram_url',
  'home.hero.cta', 'home.intro', 'home.work.heading',
  'home.dealers.heading', 'home.dealers.blurb',
  'work.heading', 'work.intro',
  'dealers.headline', 'dealers.subhead', 'dealers.turnaround',
  'dealers.consistency', 'dealers.delivery', 'dealers.coverage', 'dealers.cta',
  'services.intro',
  'about.heading', 'about.company_bio', 'about.owner_bio', 'about.approach',
  'contact.intro'
);

-- Rows that map onto something real, corrected to the actual live copy.
update public.site_content set value = 'Khanson@SynchroMediaLLC.com' where key = 'global.email';
update public.site_content set value = 'Cars, shot to sell.', label = 'Hero headline (line 1)' where key = 'home.hero.headline';
update public.site_content set value = 'Content, made to share.', label = 'Hero headline (line 2)' where key = 'home.hero.subhead';
update public.site_content set value = 'Services', label = 'Services eyebrow' where key = 'services.heading';
update public.site_content set value = 'Tell us about the shoot.', label = 'Contact headline' where key = 'contact.heading';
-- contact.success already reads "Got it — I'll be in touch within one
-- business day." in the original seed, which happens to already match the
-- live Contact.tsx success message verbatim — left as-is.

-- New keys for content the old seed never covered.
insert into public.site_content (key, label, content_type, value, group_name, sort_order) values
('global.owner_name',       'Owner full name',      'text', 'Kristopher Hanson', 'global', 35),

('social.instagram_url',    'Instagram URL',        'text', 'https://www.instagram.com/synchromediaa', 'social', 10),
('social.tiktok_url',       'TikTok URL',            'text', 'https://www.tiktok.com/@synchromediaa', 'social', 20),
('social.facebook_url',     'Facebook URL',          'text', 'https://www.facebook.com/profile.php?id=61593813066922', 'social', 30),
('social.youtube_url',      'YouTube URL',           'text', 'https://www.youtube.com/@SynchroMediaLLC', 'social', 40),

('home.bio.eyebrow',        'Bio eyebrow',           'text', 'Why Us?', 'home', 80),
('home.bio.quote',          'Bio quote', 'richtext',
 'We''re car people first — the kind who show up to a meet with a camera because we can''t help it. That''s what brings the level of quality we guarantee, cars aren''t just transportation they''re art. Whether it''s a dealership lot, your build, or a full event, we shoot every car the way we''d want ours shot.',
 'home', 90),
('home.bio.owner_name',     'Bio owner name',       'text', 'Kris Hanson', 'home', 100),
('home.bio.owner_title',    'Bio owner title',      'text', 'Owner', 'home', 110),

('social_content.eyebrow',  'Social content eyebrow','text', 'Social Content', 'social_content', 10),
('social_content.headline', 'Social content headline','text', 'Built for the feed.', 'social_content', 20),
('social_content.body',     'Social content body', 'richtext',
 'Short form videos that perform. From fast paced trending videos to slow, smooth, and cinematic eye catchers the choice is yours.',
 'social_content', 30),

('portfolio.eyebrow',       'Portfolio eyebrow',    'text', 'Portfolio', 'portfolio', 10),
('portfolio.headline',      'Portfolio headline',   'text', 'The Catalog', 'portfolio', 20),
('portfolio.body',          'Portfolio body',       'text', 'Some of our quality work, filterable by the kind of service.', 'portfolio', 30),

('contact.eyebrow',         'Contact eyebrow',      'text', 'Contact', 'contact', 5),
('contact.body',            'Contact body', 'richtext',
 'Shoots depend on weather and light more than a calendar does — share your preferred dates and how flexible you are, and we''ll confirm by reply.',
 'contact', 15),

('footer.tagline',          'Footer location line',  'text', 'Metro Atlanta, GA', 'footer', 10),

('seo.title',                'SEO title',            'text', 'Synchro Media — Automotive Photography, Atlanta', 'seo', 10),
('seo.description',          'SEO description',      'text', 'Automotive photography and video for dealerships, private owners and car events across metro Atlanta.', 'seo', 20);

-- ================================================================ services =
-- The 2026-08-20 seed's 4 rows (dealership-listing/dealership-retainer/
-- private-feature/event-coverage, with fictional pricing) never matched
-- what Services.tsx actually renders and were never shown live — replaced
-- outright rather than reconciled field-by-field.

delete from public.services;

insert into public.services (slug, kind, name, audience, blurb, bullets, sort_order) values
('dealership-lots', 'package', 'Dealership Lots', 'dealership',
 'Sell more cars faster. Quality matters to buyers — it shows professionalism and trustworthiness. Elevate your brand image and listing quality with professional images, or advertise with social media videos.',
 '["Listing photos", "Drone", "Social Media"]'::jsonb, 10),

('personal-shoots', 'package', 'Personal Shoots', 'personal',
 'Your car, your location. Golden hour, moody overcast, or clear skies. Whatever you imagine we can deliver. Personalized photos and videos for your car.',
 '["Artistic detail", "Cinematic video"]'::jsonb, 20),

('event-coverage', 'package', 'Event Coverage', 'event',
 'From cars and coffee to afternoon cruises. Full coverage with drone, rollers, group and single pictures, etc. The best way to document your epic car meet.',
 '["Drone", "Social content"]'::jsonb, 30),

('shop-brand-advertising', 'package', 'Shop & Brand Advertising', 'advertising',
 'Photo and video built to sell your shop, not just the cars in it. For mechanics, paint and wrap shops, and detailers who want marketing that looks as good as the work does.',
 '["Brand Photos", "Promo Video"]'::jsonb, 40),

('listing-photography', 'style', 'Listing Photography', null,
 'Clean, consistent shots formatted to sell cars faster online.', '[]'::jsonb, 10),

('artistic-detail-shots', 'style', 'Artistic Detail Shots', null,
 'Close-in angles that show off what makes this car special.', '[]'::jsonb, 20),

('drone-coverage', 'style', 'Drone Coverage', null,
 'Aerial footage that gives events and big lots real scale.', '[]'::jsonb, 30),

('cinematic-social-content', 'style', 'Cinematic Social Content', null,
 'Upbeat short and long-form video built for Instagram, TikTok, and YouTube.', '[]'::jsonb, 40),

('beauty-shots', 'style', 'Beauty Shots', null,
 'Scenic, artistic compositions that put the car in a setting worth stopping for.', '[]'::jsonb, 50),

('other-style', 'style', 'Other', null,
 'Have something specific in mind? Tell us what you''re picturing and we''ll bring it to life.', '[]'::jsonb, 60);

-- ============================================================== portfolio =
-- Seeds the 9 projects currently hardcoded in Portfolio.tsx, so the DB
-- matches the live site before Portfolio.tsx is rewired to read from it
-- (M5). storage_path for these pre-existing assets is the real, complete
-- path (extension included) — they predate the upload.php variant
-- convention ("<base>-<width>.webp") that new admin uploads will use, and
-- are rendered today via plain <img>/CSS background-image, not
-- next/image + the unused variantUrl() helper. See src/lib/images.ts.

do $$
declare
  v_project_id uuid;
  v_cover_id   uuid;
  v_i          int;
begin
  -- 1. Nissan 370Z — the special-cased "listing" gallery (24 frames + a
  --    separate poster image used as the cover/tile background but never
  --    part of the lightbox sequence today). Seeded here as one project
  --    with 25 images, poster first (sort_order 0) — see the admin-build
  --    plan for why unifying "cover is images[0]" is a deliberate,
  --    slightly-improved behavior, not a lift-and-shift bug.
  insert into public.projects
    (slug, title, category, vehicle_make, vehicle_model, location, status, sort_order)
  values
    ('nissan-370z-40th-anniversary', 'Nissan 370Z — 40th Anniversary Edition',
     'dealership', 'Nissan', '370Z', 'Metro Atlanta, GA · Full Shoot', 'draft', 0)
  returning id into v_project_id;

  insert into public.project_images (project_id, storage_path, width, height, sort_order)
  values (v_project_id, 'hero/370z/poster.webp', 1920, 1080, 0)
  returning id into v_cover_id;

  for v_i in 0..23 loop
    insert into public.project_images (project_id, storage_path, width, height, sort_order)
    values (v_project_id, 'hero/370z/f' || lpad(v_i::text, 2, '0') || '.webp', 1440, 810, v_i + 1);
  end loop;

  update public.projects set cover_image_id = v_cover_id, status = 'published'
  where id = v_project_id;

  -- 2..9. The 8 single-image catalog cards, in their current display order.
  insert into public.projects (slug, title, category, vehicle_make, vehicle_model, location, status, sort_order)
  values ('mazda-rx7-caffeine-octane', 'Mazda RX-7', 'event', 'Mazda', 'RX-7', 'Caffeine & Octane', 'draft', 1)
  returning id into v_project_id;
  insert into public.project_images (project_id, storage_path, width, height, sort_order)
  values (v_project_id, 'portfolio/mazda-rx7.jpg', 666, 1000, 0) returning id into v_cover_id;
  update public.projects set cover_image_id = v_cover_id, status = 'published' where id = v_project_id;

  insert into public.projects (slug, title, category, vehicle_make, vehicle_model, location, status, sort_order)
  values ('toyota-gr-supra-pair-caffeine-octane', 'Toyota GR Supra Pair', 'event', 'Toyota', 'GR Supra', 'Caffeine & Octane', 'draft', 2)
  returning id into v_project_id;
  insert into public.project_images (project_id, storage_path, width, height, sort_order)
  values (v_project_id, 'portfolio/supra-pair.jpg', 666, 1000, 0) returning id into v_cover_id;
  update public.projects set cover_image_id = v_cover_id, status = 'published' where id = v_project_id;

  insert into public.projects (slug, title, category, location, status, sort_order)
  values ('stunt-truck-burnout-run', 'Stunt Truck — Burnout Run', 'event', 'Motorsport Exhibition', 'draft', 3)
  returning id into v_project_id;
  insert into public.project_images (project_id, storage_path, width, height, sort_order)
  values (v_project_id, 'portfolio/stunt-truck-burnout.jpg', 1000, 666, 0) returning id into v_cover_id;
  update public.projects set cover_image_id = v_cover_id, status = 'published' where id = v_project_id;

  insert into public.projects (slug, title, category, vehicle_make, vehicle_model, location, status, sort_order)
  values ('chevrolet-corvette-c8-mountain-run', 'Chevrolet Corvette C8', 'event', 'Chevrolet', 'Corvette C8', 'Mountain Run Car Meet', 'draft', 4)
  returning id into v_project_id;
  insert into public.project_images (project_id, storage_path, width, height, sort_order)
  values (v_project_id, 'portfolio/corvette-c8.jpg', 666, 1000, 0) returning id into v_cover_id;
  update public.projects set cover_image_id = v_cover_id, status = 'published' where id = v_project_id;

  insert into public.projects (slug, title, category, vehicle_make, vehicle_model, location, status, sort_order)
  values ('nissan-240sx-widebody-mountain-run', 'Nissan 240SX — Widebody', 'event', 'Nissan', '240SX', 'Mountain Run Car Meet', 'draft', 5)
  returning id into v_project_id;
  insert into public.project_images (project_id, storage_path, width, height, sort_order)
  values (v_project_id, 'portfolio/240sx-widebody.jpg', 666, 1000, 0) returning id into v_cover_id;
  update public.projects set cover_image_id = v_cover_id, status = 'published' where id = v_project_id;

  insert into public.projects (slug, title, category, vehicle_make, vehicle_model, location, status, sort_order)
  values ('bmw-m4-mountain-run', 'BMW M4', 'event', 'BMW', 'M4', 'Mountain Run Car Meet', 'draft', 6)
  returning id into v_project_id;
  insert into public.project_images (project_id, storage_path, width, height, sort_order)
  values (v_project_id, 'portfolio/bmw-m4.jpg', 1000, 666, 0) returning id into v_cover_id;
  update public.projects set cover_image_id = v_cover_id, status = 'published' where id = v_project_id;

  insert into public.projects (slug, title, category, vehicle_make, vehicle_model, location, status, sort_order)
  values ('chevrolet-camaro-ss-personal', 'Chevrolet Camaro SS', 'personal', 'Chevrolet', 'Camaro SS', 'Private Commission · Atlanta, GA', 'draft', 7)
  returning id into v_project_id;
  insert into public.project_images (project_id, storage_path, width, height, sort_order)
  values (v_project_id, 'portfolio/camaro-ss-personal.jpg', 1000, 666, 0) returning id into v_cover_id;
  update public.projects set cover_image_id = v_cover_id, status = 'published' where id = v_project_id;

  insert into public.projects (slug, title, category, vehicle_make, vehicle_model, location, status, sort_order)
  values ('chevrolet-camaro-ss-rear-personal', 'Chevrolet Camaro SS — Rear', 'personal', 'Chevrolet', 'Camaro SS', 'Private Commission · Atlanta, GA', 'draft', 8)
  returning id into v_project_id;
  insert into public.project_images (project_id, storage_path, width, height, sort_order)
  values (v_project_id, 'portfolio/camaro-ss-personal-rear.jpg', 1000, 666, 0) returning id into v_cover_id;
  update public.projects set cover_image_id = v_cover_id, status = 'published' where id = v_project_id;
end $$;
