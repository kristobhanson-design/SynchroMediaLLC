"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Kind = "package" | "style";
type Audience = "dealership" | "personal" | "event" | "advertising" | "";

interface Service {
  id: string;
  slug: string;
  kind: Kind;
  name: string;
  audience: Audience | null;
  blurb: string | null;
  bullets: string[];
  sort_order: number;
  is_active: boolean;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ServiceCard({
  service,
  onChange,
  onDelete,
  onMove,
}: {
  service: Service;
  onChange: (id: string, patch: Partial<Service>) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const [local, setLocal] = useState(service);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(local) !== JSON.stringify(service);

  async function save() {
    setSaving(true);
    const { error } = await supabaseBrowser
      .from("services")
      .update({
        name: local.name,
        audience: local.audience || null,
        blurb: local.blurb,
        bullets: local.bullets,
        is_active: local.is_active,
      })
      .eq("id", local.id);
    setSaving(false);
    if (!error) onChange(local.id, local);
  }

  return (
    <div className="admin-card admin-service-card">
      <div className="admin-field-row">
        <div className="admin-field">
          <label>Name</label>
          <input value={local.name} onChange={(e) => setLocal({ ...local, name: e.target.value })} />
        </div>
        {local.kind === "package" && (
          <div className="admin-field">
            <label>Audience</label>
            <select
              value={local.audience ?? ""}
              onChange={(e) => setLocal({ ...local, audience: e.target.value as Audience })}
            >
              <option value="dealership">Dealership</option>
              <option value="personal">Personal</option>
              <option value="event">Event</option>
              <option value="advertising">Advertising</option>
            </select>
          </div>
        )}
      </div>
      <div className="admin-field">
        <label>Blurb</label>
        <textarea
          rows={2}
          value={local.blurb ?? ""}
          onChange={(e) => setLocal({ ...local, blurb: e.target.value })}
        />
      </div>
      {local.kind === "package" && (
        <div className="admin-field">
          <label>Tags (comma-separated)</label>
          <input
            value={local.bullets.join(", ")}
            onChange={(e) =>
              setLocal({ ...local, bullets: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
            }
          />
        </div>
      )}
      <div className="admin-service-actions">
        <label className="admin-checkbox-label">
          <input
            type="checkbox"
            checked={local.is_active}
            onChange={(e) => setLocal({ ...local, is_active: e.target.checked })}
          />
          Active
        </label>
        <button className="admin-link-btn" onClick={() => onMove(local.id, -1)}>
          Move up
        </button>
        <button className="admin-link-btn" onClick={() => onMove(local.id, 1)}>
          Move down
        </button>
        <button className="admin-link-btn admin-link-danger" onClick={() => onDelete(local.id)}>
          Delete
        </button>
        {dirty && (
          <button className="admin-btn admin-btn-primary admin-btn-small" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ServicesEditor() {
  const [services, setServices] = useState<Service[] | null>(null);

  async function load() {
    const { data } = await supabaseBrowser.from("services").select("*").order("kind").order("sort_order");
    setServices((data as Service[]) ?? []);
  }

  useEffect(() => {
    supabaseBrowser
      .from("services")
      .select("*")
      .order("kind")
      .order("sort_order")
      .then(({ data }) => setServices((data as Service[]) ?? []));
  }, []);

  async function addService(kind: Kind) {
    const group = services?.filter((s) => s.kind === kind) ?? [];
    const nextSort = (group.at(-1)?.sort_order ?? 0) + 10;
    const name = kind === "package" ? "New Package" : "New Style";
    const { data, error } = await supabaseBrowser
      .from("services")
      .insert({
        slug: `${slugify(name)}-${Date.now()}`,
        kind,
        name,
        audience: kind === "package" ? "dealership" : null,
        blurb: "",
        bullets: [],
        sort_order: nextSort,
      })
      .select()
      .single();
    if (!error && data) setServices((prev) => [...(prev ?? []), data as Service]);
  }

  async function deleteService(id: string) {
    if (!confirm("Delete this service? This can't be undone.")) return;
    const { error } = await supabaseBrowser.from("services").delete().eq("id", id);
    if (!error) setServices((prev) => prev?.filter((s) => s.id !== id) ?? prev);
  }

  async function moveService(id: string, dir: -1 | 1) {
    if (!services) return;
    const kind = services.find((s) => s.id === id)?.kind;
    const group = services.filter((s) => s.kind === kind).sort((a, b) => a.sort_order - b.sort_order);
    const idx = group.findIndex((s) => s.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= group.length) return;
    const a = group[idx];
    const b = group[swapIdx];
    await Promise.all([
      supabaseBrowser.from("services").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabaseBrowser.from("services").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    await load();
  }

  if (!services) return <div className="admin-screen">Loading services…</div>;

  return (
    <div className="admin-screen">
      <h1>Services</h1>

      <h2 className="admin-group-heading">Packages</h2>
      {services
        .filter((s) => s.kind === "package")
        .map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            onChange={(id, patch) =>
              setServices((prev) => prev?.map((x) => (x.id === id ? { ...x, ...patch } : x)) ?? prev)
            }
            onDelete={deleteService}
            onMove={moveService}
          />
        ))}
      <button className="admin-btn" onClick={() => addService("package")}>
        + Add package
      </button>

      <h2 className="admin-group-heading" style={{ marginTop: 32 }}>
        What we shoot
      </h2>
      {services
        .filter((s) => s.kind === "style")
        .map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            onChange={(id, patch) =>
              setServices((prev) => prev?.map((x) => (x.id === id ? { ...x, ...patch } : x)) ?? prev)
            }
            onDelete={deleteService}
            onMove={moveService}
          />
        ))}
      <button className="admin-btn" onClick={() => addService("style")}>
        + Add style
      </button>
    </div>
  );
}
