-- Synchro Media LLC — seed content
--
-- Every editable string on the public site, with real first-draft Atlanta copy
-- rather than lorem ipsum, so there is something concrete to react to. All of
-- it is editable from /admin without a code change.

insert into public.site_content (key, label, content_type, value, group_name, sort_order) values

-- global -------------------------------------------------------------------
('global.company_name',    'Company name',        'text', 'Synchro Media LLC', 'global', 10),
('global.tagline',         'Tagline',             'text', 'Automotive photography and video — Atlanta', 'global', 20),
('global.email',           'Contact email',       'text', '', 'global', 30),
('global.phone',           'Contact phone',       'text', '', 'global', 40),
('global.service_area',    'Service area line',   'text', 'Serving metro Atlanta — Fulton, Cobb, Gwinnett, DeKalb, Cherokee and Forsyth counties', 'global', 50),
('global.instagram_url',   'Instagram URL',       'text', '', 'global', 60),
('global.response_time',   'Stated response time','text', 'within one business day', 'global', 70),

-- home ---------------------------------------------------------------------
('home.hero.headline',     'Hero headline',       'text', 'Vehicles, shot properly.', 'home', 10),
('home.hero.subhead',      'Hero subhead',        'text', 'Listing photography, private commissions and event coverage across metro Atlanta.', 'home', 20),
('home.hero.cta',          'Hero button label',   'text', 'Request a quote', 'home', 30),
('home.intro',             'Intro paragraph',   'richtext', 'Most vehicle photos are taken in a hurry, in bad light, on a phone. The difference between that and a considered set of images is the difference between a listing people scroll past and one they stop on.', 'home', 40),
('home.work.heading',      'Featured work heading','text','Selected work', 'home', 50),
('home.dealers.heading',   'Dealer teaser heading','text','For dealerships', 'home', 60),
('home.dealers.blurb',     'Dealer teaser copy', 'richtext', 'Consistent, fast-turnaround listing photography for your whole lot — shot to the same framing and light every time, delivered ready to upload.', 'home', 70),

-- work ---------------------------------------------------------------------
('work.heading',           'Work page heading',   'text', 'Work', 'work', 10),
('work.intro',             'Work page intro',   'richtext', 'A selection of recent shoots across dealership, private and event work.', 'work', 20),

-- dealerships --------------------------------------------------------------
('dealers.headline',       'Dealer page headline','text', 'Photography that moves inventory.', 'dealerships', 10),
('dealers.subhead',        'Dealer page subhead', 'text', 'Consistent listing imagery for metro Atlanta dealerships, on a schedule you can plan around.', 'dealerships', 20),
('dealers.turnaround',     'Turnaround promise',  'text', 'Shot by 2pm, delivered by 9am the next business day.', 'dealerships', 30),
('dealers.consistency',    'Consistency section','richtext', 'Every vehicle framed, lit and edited the same way, so your listing pages look like one dealership rather than twelve different phones.', 'dealerships', 40),
('dealers.delivery',       'Delivery section',  'richtext', 'Delivered as a shared gallery or straight to your listing provider, exported to the dimensions and image counts each platform expects — no rejected uploads, no awkward crops.', 'dealerships', 50),
('dealers.coverage',       'Coverage area',     'richtext', 'Regularly on lots in Marietta, Kennesaw, Alpharetta, Roswell, Duluth, Buford, Lawrenceville, Chamblee and Union City. Travel beyond the perimeter is normal — ask.', 'dealerships', 60),
('dealers.cta',            'Dealer CTA label',    'text', 'Discuss a recurring schedule', 'dealerships', 70),

-- services -----------------------------------------------------------------
('services.heading',       'Services heading',    'text', 'Services', 'services', 10),
('services.intro',         'Services intro',    'richtext', 'Starting prices. Every shoot is quoted individually once I know the vehicle, the location and what the images are for.', 'services', 20),

-- about --------------------------------------------------------------------
('about.heading',          'About heading',       'text', 'About', 'about', 10),
('about.company_bio',      'Company bio',       'richtext', 'Synchro Media is an automotive photography and video studio based in Atlanta, working with dealerships, private owners and event organizers across north Georgia.', 'about', 20),
('about.owner_bio',        'Your bio',          'richtext', '', 'about', 30),
('about.approach',         'Approach / process','richtext', 'Shoots are planned around light and weather rather than the calendar. That means early mornings, late afternoons, and honest conversations about pollen season.', 'about', 40),

-- contact ------------------------------------------------------------------
('contact.heading',        'Contact heading',     'text', 'Request a quote', 'contact', 10),
('contact.intro',          'Contact intro',     'richtext', 'Tell me about the vehicle, the location and roughly when you have in mind. Shoots are confirmed by reply rather than booked instantly, so we can plan around light and weather.', 'contact', 20),
('contact.success',        'Post-submit message','text', 'Got it — I''ll be in touch within one business day.', 'contact', 30);

-- services -----------------------------------------------------------------

insert into public.services (slug, name, audience, blurb, starting_price_cents, price_note, bullets, sort_order) values
('dealership-listing', 'Dealership listing package', 'dealership',
 'Per-vehicle listing photography with consistent framing across your lot.',
 12500, 'per vehicle, volume pricing available',
 '["Exterior, interior and detail coverage","Consistent framing and edit across every unit","Next-business-day delivery","Exported to your listing platform''s specs"]'::jsonb, 10),

('dealership-retainer', 'Recurring lot coverage', 'dealership',
 'A standing weekly or biweekly slot so new inventory never sits unphotographed.',
 null, 'quoted on volume and frequency',
 '["Scheduled weekly or biweekly visits","Priority turnaround","Volume rate per vehicle","Single point of contact"]'::jsonb, 20),

('private-feature', 'Private feature shoot', 'personal',
 'A considered set of images of your car, shot on location around Atlanta.',
 35000, 'starting, half-day',
 '["Location scouted to suit the car","Golden-hour scheduling","Fully edited high-resolution gallery","Print-ready files on request"]'::jsonb, 30),

('event-coverage', 'Event coverage', 'event',
 'Full coverage of meets, shows and track days.',
 50000, 'starting, half-day',
 '["Cars, people and atmosphere","Fast turnaround for social posting","Organizer usage rights","Full-day and multi-day rates available"]'::jsonb, 40);
