"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Status = "new" | "contacted" | "quoted" | "scheduled" | "won" | "lost";

const STATUSES: Status[] = ["new", "contacted", "quoted", "scheduled", "won", "lost"];

interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  audience: string;
  vehicle_details: string | null;
  location: string | null;
  preferred_dates: string | null;
  message: string | null;
  status: Status;
  admin_notes: string | null;
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser
      .from("quote_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setLeads((data as Lead[]) ?? []));
  }, []);

  const selected = leads?.find((l) => l.id === selectedId) ?? null;
  const visible = leads?.filter((l) => filter === "all" || l.status === filter) ?? [];

  async function updateLead(id: string, patch: Partial<Pick<Lead, "status" | "admin_notes">>) {
    setSavingId(id);
    const { error } = await supabaseBrowser.from("quote_requests").update(patch).eq("id", id);
    if (!error) {
      setLeads((prev) => prev?.map((l) => (l.id === id ? { ...l, ...patch } : l)) ?? prev);
    }
    setSavingId(null);
  }

  if (!leads) return <div className="admin-screen">Loading leads…</div>;

  return (
    <div className="admin-screen admin-leads">
      <h1>Leads</h1>

      <div className="admin-filter-row">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            className={`admin-chip${filter === s ? " active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="admin-leads-layout">
        <ul className="admin-leads-list">
          {visible.length === 0 && <li className="admin-empty">No leads here.</li>}
          {visible.map((l) => (
            <li key={l.id}>
              <button
                className={`admin-lead-row${selectedId === l.id ? " active" : ""}`}
                onClick={() => setSelectedId(l.id)}
              >
                <span className="admin-lead-name">{l.name}</span>
                <span className="admin-lead-meta">
                  {l.audience} · {new Date(l.created_at).toLocaleDateString()}
                </span>
                <span className={`admin-status-pill admin-status-${l.status}`}>{l.status}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="admin-lead-detail">
          {!selected && <p className="admin-empty">Select a lead to see the full request.</p>}
          {selected && (
            <>
              <h2>{selected.name}</h2>
              <dl className="admin-detail-grid">
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                </dd>
                {selected.phone && (
                  <>
                    <dt>Phone</dt>
                    <dd>{selected.phone}</dd>
                  </>
                )}
                {selected.company && (
                  <>
                    <dt>Company</dt>
                    <dd>{selected.company}</dd>
                  </>
                )}
                <dt>Audience</dt>
                <dd>{selected.audience}</dd>
                {selected.vehicle_details && (
                  <>
                    <dt>Vehicle</dt>
                    <dd>{selected.vehicle_details}</dd>
                  </>
                )}
                {selected.location && (
                  <>
                    <dt>Location</dt>
                    <dd>{selected.location}</dd>
                  </>
                )}
                {selected.preferred_dates && (
                  <>
                    <dt>Preferred dates</dt>
                    <dd>{selected.preferred_dates}</dd>
                  </>
                )}
                <dt>Submitted</dt>
                <dd>{new Date(selected.created_at).toLocaleString()}</dd>
              </dl>

              {selected.message && (
                <div className="admin-field">
                  <label>Message</label>
                  <p className="admin-message-block">{selected.message}</p>
                </div>
              )}

              <div className="admin-field">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={selected.status}
                  disabled={savingId === selected.id}
                  onChange={(e) => updateLead(selected.id, { status: e.target.value as Status })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <label htmlFor="notes">Private notes</label>
                <textarea
                  id="notes"
                  rows={4}
                  defaultValue={selected.admin_notes ?? ""}
                  disabled={savingId === selected.id}
                  onBlur={(e) => {
                    if (e.target.value !== (selected.admin_notes ?? "")) {
                      updateLead(selected.id, { admin_notes: e.target.value });
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
