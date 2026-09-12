"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Status = "checking" | "ready" | "invalid" | "success";

/**
 * Catches the link from a Supabase recovery email. supabase-js parses the
 * URL hash on load (detectSessionInUrl, on by default) and establishes a
 * session from the recovery token — that's what getSession() below picks
 * up. This page didn't exist before 2026-09-12: the recovery email worked
 * (Supabase sent it, the link's token was valid), but there was nowhere
 * for it to land and let the owner actually set a new password. See
 * project-admin-panel memory for the Site URL misconfiguration that was
 * the other half of that bug.
 */
export default function ResetPassword() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    function evaluate(hasSession: boolean) {
      if (cancelled) return;
      setStatus((prev) => (prev === "success" ? prev : hasSession ? "ready" : "invalid"));
    }

    supabaseBrowser.auth.getSession().then(({ data }) => evaluate(!!data.session));
    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      evaluate(!!session);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: updateError } = await supabaseBrowser.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setStatus("success");
  }

  return (
    <div className="admin-auth-screen">
      <div className="admin-auth-card">
        <h1>Reset password</h1>

        {status === "checking" && <p>Checking your link…</p>}

        {status === "invalid" && (
          <>
            <p>
              This link is invalid or has expired. Request a new one from the sign-in page&apos;s
              &quot;Forgot password?&quot; link.
            </p>
            <a className="admin-btn admin-btn-primary" href="/admin/">
              Back to sign in
            </a>
          </>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="admin-field">
              <label htmlFor="password">New password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoFocus
              />
            </div>
            <div className="admin-field">
              <label htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && <p className="admin-error">{error}</p>}
            <button className="admin-btn admin-btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Set new password"}
            </button>
          </form>
        )}

        {status === "success" && (
          <>
            <p>Password updated. You can sign in with it now.</p>
            <a className="admin-btn admin-btn-primary" href="/admin/">
              Go to sign in
            </a>
          </>
        )}
      </div>
    </div>
  );
}
