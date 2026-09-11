"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type PublishState = "loading" | "clean" | "pending" | "publishing" | "error";

async function latestUpdate(table: "projects" | "services" | "site_content"): Promise<string | null> {
  const { data } = await supabaseBrowser
    .from(table)
    .select("updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.updated_at ?? null;
}

export default function Dashboard() {
  const [state, setState] = useState<PublishState>("loading");
  const [lastPublished, setLastPublished] = useState<string | null>(null);
  const [newLeadCount, setNewLeadCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Pure fetch-and-compute, no setState — kept separate from `refresh` so
  // the mount effect below can chain `.then()` directly on it instead of
  // calling a function that itself sets state from an effect body.
  const fetchStatus = useCallback(async () => {
    const [meta, dates, leads] = await Promise.all([
      supabaseBrowser.from("site_meta").select("last_published_at").eq("id", 1).single(),
      Promise.all([latestUpdate("projects"), latestUpdate("services"), latestUpdate("site_content")]),
      supabaseBrowser.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    ]);

    const publishedAt = meta.data?.last_published_at ?? null;
    const latest = dates.filter((d): d is string => d !== null).sort().at(-1) ?? null;
    const state: PublishState = !latest || !publishedAt || new Date(latest) <= new Date(publishedAt) ? "clean" : "pending";

    return { publishedAt, newLeadCount: leads.count ?? 0, state };
  }, []);

  const refresh = useCallback(async () => {
    setState("loading");
    const result = await fetchStatus();
    setLastPublished(result.publishedAt);
    setNewLeadCount(result.newLeadCount);
    setState(result.state);
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus().then((result) => {
      setLastPublished(result.publishedAt);
      setNewLeadCount(result.newLeadCount);
      setState(result.state);
    });
  }, [fetchStatus]);

  async function handlePublish() {
    setState("publishing");
    setError("");
    const { data, error } = await supabaseBrowser.functions.invoke("publish");
    if (error || !data?.ok) {
      setError(error?.message || data?.error || "Publish failed. Please try again.");
      setState("error");
      return;
    }
    await refresh();
  }

  return (
    <div className="admin-screen">
      <h1>Dashboard</h1>

      <div className="admin-card admin-publish-card">
        {state === "loading" && <p>Checking publish status…</p>}
        {state === "clean" && (
          <p>
            <strong>Site is up to date.</strong>
            {lastPublished && ` Last published ${new Date(lastPublished).toLocaleString()}.`}
          </p>
        )}
        {(state === "pending" || state === "publishing" || state === "error") && (
          <>
            <p>
              <strong>Unpublished changes.</strong> Content has changed since the last publish
              {lastPublished && ` (${new Date(lastPublished).toLocaleString()})`} — the live site
              doesn&apos;t reflect it yet.
            </p>
            <button className="admin-btn admin-btn-primary" onClick={handlePublish} disabled={state === "publishing"}>
              {state === "publishing" ? "Publishing…" : "Publish"}
            </button>
            {state === "error" && <p className="admin-error">{error}</p>}
          </>
        )}
      </div>

      <div className="admin-card">
        <p>
          <strong>{newLeadCount ?? "…"}</strong> new lead{newLeadCount === 1 ? "" : "s"} awaiting a
          reply.
        </p>
      </div>
    </div>
  );
}
