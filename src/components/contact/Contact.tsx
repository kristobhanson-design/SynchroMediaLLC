"use client";

import { useReveal } from "@/hooks/useReveal";

// The Supabase Edge Function that will receive these submissions (PLAN.md
// §8 / Phase 7) doesn't exist yet, so this form doesn't submit anywhere
// yet — matching the Artifact's own `onsubmit="return false;"` placeholder,
// not a silent scope cut.
export default function Contact() {
  const headRef = useReveal<HTMLDivElement>();
  const formRef = useReveal<HTMLFormElement>();
  const infoRef = useReveal<HTMLDivElement>();

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
          <form ref={formRef} className="quote-form reveal" onSubmit={(e) => e.preventDefault()}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" type="text" placeholder="Your name" />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" placeholder="you@example.com" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="company">Company Name (Optional)</label>
              <input id="company" type="text" placeholder="Dealership or business name" />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" type="tel" placeholder="(678) 555-0123" />
              </div>
              <div className="field">
                <label htmlFor="audience">This request is for</label>
                <select id="audience">
                  <option>Dealership</option>
                  <option>Personal</option>
                  <option>Event</option>
                  <option>Advertisement</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="dates">Preferred dates</label>
              <input id="dates" type="text" placeholder="e.g. weekend of Sept 12, flexible ±3 days" />
            </div>
            <div className="field">
              <label htmlFor="message">Tell us about the shoot</label>
              <textarea id="message" rows={3} placeholder="Vehicle, location, and what you're hoping to get" />
            </div>
            <button className="btn btn-primary" type="submit">
              Send request
            </button>
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
