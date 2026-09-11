"use client";

import { useState, type FormEvent } from "react";
import { useReveal } from "@/hooks/useReveal";

type Status = "idle" | "submitting" | "success" | "error";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function Contact() {
  const headRef = useReveal<HTMLDivElement>();
  const formRef = useReveal<HTMLFormElement>();
  const infoRef = useReveal<HTMLDivElement>();

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setStatus("error");
      setErrorMessage("This form isn't configured yet — email us directly for now.");
      return;
    }

    const form = e.currentTarget;
    const data = new FormData(form);
    setStatus("submitting");
    setErrorMessage("");

    try {
      let res: Response;
      try {
        res = await fetch(`${SUPABASE_URL}/functions/v1/quote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            name: data.get("name"),
            email: data.get("email"),
            phone: data.get("phone"),
            company: data.get("company"),
            audience: data.get("audience"),
            preferred_dates: data.get("dates"),
            message: data.get("message"),
            source_page: "/",
            // Honeypot — left empty by real visitors, see supabase/functions/quote.
            website: data.get("website"),
          }),
        });
      } catch {
        // A network-level failure (offline, DNS, CORS) throws a raw
        // browser TypeError with no useful text for a visitor — always
        // show our own copy here instead of err.message.
        throw new Error(
          "We couldn't reach the server. Check your connection and try again, or email us directly.",
        );
      }

      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error || "Something went wrong. Please try again.");
      }

      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <section className="block" id="contact">
      <div className="wrap">
        <div ref={headRef} className="section-head reveal">
          <p className="eyebrow">Contact</p>
          <h2>Tell us about the shoot.</h2>
          <p>
            Shoots depend on weather and light more than a calendar does — share your preferred
            dates and how flexible you are, and we&apos;ll confirm by reply.
          </p>
        </div>
        <div className="contact-grid">
          <form ref={formRef} className="quote-form reveal" onSubmit={handleSubmit}>
            {/* Honeypot: visually hidden (not display:none, which some bots skip),
                never focusable or announced. Real visitors never see or fill it. */}
            <div style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
              <label htmlFor="website">Leave this field empty</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" type="text" placeholder="Your name" required />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" placeholder="you@example.com" required />
              </div>
            </div>
            <div className="field">
              <label htmlFor="company">Company Name (Optional)</label>
              <input id="company" name="company" type="text" placeholder="Dealership or business name" />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" type="tel" placeholder="(678) 555-0123" />
              </div>
              <div className="field">
                <label htmlFor="audience">This request is for</label>
                <select id="audience" name="audience" defaultValue="dealership">
                  <option value="dealership">Dealership</option>
                  <option value="personal">Personal</option>
                  <option value="event">Event</option>
                  <option value="advertisement">Advertisement</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="dates">Preferred dates</label>
              <input id="dates" name="dates" type="text" placeholder="e.g. weekend of Sept 12, flexible ±3 days" />
            </div>
            <div className="field">
              <label htmlFor="message">Tell us about the shoot</label>
              <textarea
                id="message"
                name="message"
                rows={3}
                placeholder="Vehicle, location, and what you're hoping to get"
                required
              />
            </div>

            {status === "success" ? (
              <p role="status" style={{ color: "var(--ink)", margin: 0 }}>
                Got it — I&apos;ll be in touch within one business day.
              </p>
            ) : (
              <>
                <button className="btn btn-primary" type="submit" disabled={status === "submitting"}>
                  {status === "submitting" ? "Sending…" : "Send request"}
                </button>
                {status === "error" && (
                  <p role="alert" style={{ color: "#d0202c", margin: 0, fontSize: 13.5 }}>
                    {errorMessage}
                  </p>
                )}
              </>
            )}
          </form>

          <div ref={infoRef} className="contact-info reveal">
            <div className="info-card">
              <h3>Direct contact</h3>
              <div className="info-row">
                <span className="k">Name</span>
                <span className="v">Kristopher Hanson</span>
              </div>
              <div className="info-row">
                <span className="k">Email</span>
                <a className="v" href="mailto:Khanson@SynchroMediaLLC.com">
                  Khanson@SynchroMediaLLC.com
                </a>
              </div>
            </div>
            <div className="info-card promise-card">
              <p>
                Based on the west side of Atlanta, and happy to travel for the right shoot. We
                plan around Georgia weather — pollen season and summer storms included — so your
                shoot always gets the perfect look.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
