// Synchro Media — quote request intake (PLAN.md §2.1 "Quote form backend",
// §8 Phase 7). Public endpoint: the Contact form (src/components/contact/
// Contact.tsx) POSTs here directly with the anon key as its bearer token.
//
// This function is the ONLY writer of public.quote_requests — the table
// grants no insert to anon/authenticated (see
// supabase/migrations/20260820163901_rls_policies.sql), so every row here
// came from this validation path, not straight from a browser.
//
// Secrets this function needs (Project Settings → Edge Functions → Secrets,
// or `supabase secrets set`):
//   RESEND_API_KEY     - required to send any email at all
//   NOTIFY_EMAIL        - where new-lead notifications go (defaults below)
//   RESEND_FROM_EMAIL   - verified sender (defaults to Resend's shared
//                         onboarding@resend.dev, which works with zero setup
//                         but is rate-limited and not on your own domain —
//                         swap in a synchromediallc.com sender once that
//                         domain is verified in Resend)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically into
// every Edge Function; they are not set by hand.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://synchromediallc.com",
  "https://www.synchromediallc.com",
  "http://localhost:3000",
]);

const AUDIENCES = new Set(["dealership", "personal", "event", "advertisement", "other"]);

// Loose but real: catches typos ("bob@gmailcom") without rejecting valid
// addresses RFC 5322 would technically allow. Good enough for a lead form.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_LEN = {
  name: 200,
  email: 320,
  phone: 40,
  company: 200,
  vehicle_details: 500,
  location: 200,
  preferred_dates: 300,
  message: 5000,
};

function corsHeaders(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request body" }, 400, origin);
  }

  // Honeypot: a field real visitors never see or fill (Contact.tsx renders
  // it off-screen, not display:none — bots that skip hidden inputs still
  // catch this one). A filled honeypot means "bot" with high confidence, so
  // we return success without writing anything or spending an email send —
  // telling the bot it worked is more useful than telling it to try harder.
  if (clean(body.website, 200) !== "") {
    return json({ ok: true }, 200, origin);
  }

  const name = clean(body.name, MAX_LEN.name);
  const email = clean(body.email, MAX_LEN.email);
  const message = clean(body.message, MAX_LEN.message);
  const audienceRaw = clean(body.audience, 20).toLowerCase();
  const audience = AUDIENCES.has(audienceRaw) ? audienceRaw : "other";

  const phone = clean(body.phone, MAX_LEN.phone);
  const company = clean(body.company, MAX_LEN.company);
  const vehicle_details = clean(body.vehicle_details, MAX_LEN.vehicle_details);
  const location = clean(body.location, MAX_LEN.location);
  const preferred_dates = clean(body.preferred_dates, MAX_LEN.preferred_dates);
  const source_page = clean(body.source_page, 200) || null;

  if (!name || !email || !message) {
    return json(
      { ok: false, error: "Name, email, and a message are required." },
      422,
      origin,
    );
  }
  if (!EMAIL_RE.test(email)) {
    return json({ ok: false, error: "That email address doesn't look right." }, 422, origin);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Rate limit by email: 3 submissions/24h is generous for a real client
  // (who has no reason to resubmit that often) and cheap for a bot to
  // exceed on the first try — no Turnstile/Cloudflare wired up yet
  // (PLAN.md §2.1), so this plus the honeypot is the whole spam defense
  // for now.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("quote_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);

  if (countError) {
    console.error("rate-limit check failed", countError);
    return json({ ok: false, error: "Something went wrong. Please try again." }, 500, origin);
  }
  if ((count ?? 0) >= 3) {
    return json(
      { ok: false, error: "You've already sent a few requests today — we'll be in touch soon." },
      429,
      origin,
    );
  }

  const { error: insertError } = await supabase.from("quote_requests").insert({
    name,
    email,
    phone: phone || null,
    company: company || null,
    audience,
    vehicle_details: vehicle_details || null,
    location: location || null,
    preferred_dates: preferred_dates || null,
    message,
    source_page,
  });

  if (insertError) {
    console.error("quote_requests insert failed", insertError);
    return json({ ok: false, error: "Something went wrong. Please try again." }, 500, origin);
  }

  // Email is best-effort: the lead is already saved, so a Resend hiccup
  // should not turn into a false failure for the person submitting the
  // form. Errors are logged (visible in the function's logs) rather than
  // thrown.
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (resendKey) {
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "Synchro Media <onboarding@resend.dev>";
    const notifyTo = Deno.env.get("NOTIFY_EMAIL") || "Khanson@SynchroMediaLLC.com";

    const notify = fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: notifyTo,
        reply_to: email,
        subject: `New quote request — ${name}`,
        text: [
          `Name: ${name}`,
          `Email: ${email}`,
          phone && `Phone: ${phone}`,
          company && `Company: ${company}`,
          `Audience: ${audience}`,
          vehicle_details && `Vehicle: ${vehicle_details}`,
          location && `Location: ${location}`,
          preferred_dates && `Preferred dates: ${preferred_dates}`,
          "",
          message,
        ]
          .filter(Boolean)
          .join("\n"),
      }),
    });

    const autoReply = fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: email,
        subject: "Got your request — Synchro Media",
        text:
          `Hey ${name},\n\n` +
          "Got it — I'll be in touch within one business day.\n\n" +
          "Kristopher\nSynchro Media",
      }),
    });

    const [notifyRes, autoReplyRes] = await Promise.allSettled([notify, autoReply]);
    for (const res of [notifyRes, autoReplyRes]) {
      if (res.status === "rejected") {
        console.error("resend send failed", res.reason);
      } else if (!res.value.ok) {
        console.error("resend send failed", res.value.status, await res.value.text());
      }
    }
  } else {
    console.error("RESEND_API_KEY not set — lead saved but no email sent");
  }

  return json({ ok: true }, 200, origin);
});
