"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

interface ContentRow {
  key: string;
  label: string;
  content_type: "text" | "richtext" | "image";
  value: string;
  group_name: string;
  sort_order: number;
}

function Row({ row, onSaved }: { row: ContentRow; onSaved: (key: string, value: string) => void }) {
  const [value, setValue] = useState(row.value);
  const [saving, setSaving] = useState(false);
  const dirty = value !== row.value;

  async function save() {
    setSaving(true);
    const { error } = await supabaseBrowser.from("site_content").update({ value }).eq("key", row.key);
    setSaving(false);
    if (!error) onSaved(row.key, value);
  }

  return (
    <div className="admin-field admin-content-row">
      <label htmlFor={row.key}>{row.label}</label>
      {row.content_type === "richtext" ? (
        <textarea id={row.key} rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
      ) : (
        <input id={row.key} type="text" value={value} onChange={(e) => setValue(e.target.value)} />
      )}
      {dirty && (
        <button className="admin-btn admin-btn-primary admin-btn-small" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}

export default function ContentEditor() {
  const [rows, setRows] = useState<ContentRow[] | null>(null);

  useEffect(() => {
    supabaseBrowser
      .from("site_content")
      .select("*")
      .order("group_name")
      .order("sort_order")
      .then(({ data }) => setRows((data as ContentRow[]) ?? []));
  }, []);

  if (!rows) return <div className="admin-screen">Loading site content…</div>;

  const groups = [...new Set(rows.map((r) => r.group_name))];

  return (
    <div className="admin-screen">
      <h1>Site Content</h1>
      <p className="admin-hint">
        Changes here don&apos;t go live until you hit Publish on the Dashboard — the public site is
        static and only rebuilds on publish.
      </p>
      {groups.map((group) => (
        <div className="admin-card" key={group}>
          <h2 className="admin-group-heading">{group}</h2>
          {rows
            .filter((r) => r.group_name === group)
            .map((row) => (
              <Row
                key={row.key}
                row={row}
                onSaved={(key, value) =>
                  setRows((prev) => prev?.map((r) => (r.key === key ? { ...r, value } : r)) ?? prev)
                }
              />
            ))}
        </div>
      ))}
    </div>
  );
}
