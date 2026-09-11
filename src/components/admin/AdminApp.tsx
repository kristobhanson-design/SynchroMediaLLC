"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/browser";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Leads from "./Leads";
import ContentEditor from "./ContentEditor";
import ServicesEditor from "./ServicesEditor";
import PortfolioManager from "./PortfolioManager";

type AuthState = "loading" | "signed_out" | "not_admin" | "admin";
type Screen = "dashboard" | "leads" | "content" | "services" | "portfolio";

const NAV: { id: Screen; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "leads", label: "Leads" },
  { id: "content", label: "Site Content" },
  { id: "services", label: "Services" },
  { id: "portfolio", label: "Portfolio" },
];

/**
 * The whole /admin route is one static shell (see next.config.ts —
 * output:'export' can't do per-record dynamic routes) that does its own
 * client-side auth check and screen switching. There is no server to gate
 * this at the HTTP level; RLS is what actually protects the data
 * (supabase/migrations/20260820163901_rls_policies.sql) — this component
 * only controls what's rendered, not what's reachable.
 */
export default function AdminApp() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");

  useEffect(() => {
    let cancelled = false;

    async function evaluate(nextSession: Session | null) {
      if (!nextSession) {
        if (!cancelled) {
          setSession(null);
          setAuthState("signed_out");
        }
        return;
      }
      const { data, error } = await supabaseBrowser.rpc("is_admin");
      if (cancelled) return;
      setSession(nextSession);
      setAuthState(!error && data === true ? "admin" : "not_admin");
    }

    supabaseBrowser.auth.getSession().then(({ data }) => evaluate(data.session));

    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange((_event, nextSession) => {
      evaluate(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (authState === "loading") {
    return <div className="admin-auth-screen">Loading…</div>;
  }

  if (authState === "signed_out") {
    return <Login />;
  }

  if (authState === "not_admin") {
    return (
      <div className="admin-auth-screen">
        <div className="admin-auth-card">
          <h1>Not authorized</h1>
          <p>
            {session?.user.email} is signed in but isn&apos;t on the admin allowlist. Contact
            whoever manages the Supabase project if this is unexpected.
          </p>
          <button className="admin-btn" onClick={() => supabaseBrowser.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">Synchro Media</div>
        <nav>
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`admin-nav-item${screen === n.id ? " active" : ""}`}
              onClick={() => setScreen(n.id)}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <span>{session?.user.email}</span>
          <button className="admin-link-btn" onClick={() => supabaseBrowser.auth.signOut()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        {screen === "dashboard" && <Dashboard />}
        {screen === "leads" && <Leads />}
        {screen === "content" && <ContentEditor />}
        {screen === "services" && <ServicesEditor />}
        {screen === "portfolio" && <PortfolioManager />}
      </main>
    </div>
  );
}
