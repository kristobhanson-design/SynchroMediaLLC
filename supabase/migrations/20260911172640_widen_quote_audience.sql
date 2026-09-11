-- Widen quote_requests.audience to match the live contact form's options.
--
-- The original constraint only allowed ('dealership', 'personal', 'event') —
-- copied from projects/services, which are about the *content* being
-- categorized. quote_requests.audience is different: it's "what kind of
-- request is this", and the shipped Contact form (src/components/contact/
-- Contact.tsx) offers two more choices that never fit that content taxonomy:
-- Advertisement (a shop/brand ad shoot, not tied to a single vehicle or
-- event) and Other (an intentional escape hatch, not a bug). Rather than
-- force those into the three-value set, this migration gives
-- quote_requests its own, wider vocabulary.

alter table public.quote_requests
  drop constraint quote_requests_audience_check;

alter table public.quote_requests
  add constraint quote_requests_audience_check
  check (audience in ('dealership', 'personal', 'event', 'advertisement', 'other'));
