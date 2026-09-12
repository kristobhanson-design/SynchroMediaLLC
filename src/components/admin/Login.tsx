"use client";

import { useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Mode = "sign-in" | "forgot" | "forgot-sent";

export default function Login() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setSubmitting(false);
    }
    // On success, the onAuthStateChange listener in AdminApp picks up the
    // new session — no need to do anything else here.
  }

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    // Explicit redirectTo rather than relying on Auth's Site URL setting —
    // this survives that setting being wrong (see project-admin-panel
    // memory for the 2026-09-12 incident where it pointed at
    // localhost:3000) as long as this exact URL is also in the Redirect
    // URLs allowlist in the Supabase dashboard.
    const { error } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password/`,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setMode("forgot-sent");
  }

  if (mode === "forgot-sent") {
    return (
      <div className="admin-auth-screen">
        <div className="admin-auth-card">
          <h1>Check your email</h1>
          <p>
            If an account exists for {email}, a reset link is on its way. Supabase&apos;s default
            mailer sends these slowly — a handful per hour — so give it a minute before asking
            for another.
          </p>
          <button className="admin-link-btn" onClick={() => setMode("sign-in")}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-auth-screen">
      <form className="admin-auth-card" onSubmit={mode === "forgot" ? handleForgotSubmit : handleSubmit}>
        <h1>{mode === "forgot" ? "Reset your password" : "Synchro Media Admin"}</h1>
        <div className="admin-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        {mode === "sign-in" && (
          <div className="admin-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        )}
        {error && <p className="admin-error">{error}</p>}
        <button className="admin-btn admin-btn-primary" type="submit" disabled={submitting}>
          {submitting ? (mode === "forgot" ? "Sending…" : "Signing in…") : mode === "forgot" ? "Send reset link" : "Sign in"}
        </button>
        <button
          type="button"
          className="admin-link-btn"
          onClick={() => {
            setError("");
            setMode(mode === "forgot" ? "sign-in" : "forgot");
          }}
        >
          {mode === "forgot" ? "Back to sign in" : "Forgot password?"}
        </button>
      </form>
    </div>
  );
}
