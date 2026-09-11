"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Category = "dealership" | "personal" | "event";
type Status = "draft" | "published";

interface ProjectImage {
  id: string;
  project_id: string;
  storage_path: string;
  alt_text: string | null;
  width: number;
  height: number;
  blur_data_url: string | null;
  sort_order: number;
}

interface Project {
  id: string;
  slug: string;
  title: string;
  category: Category;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  location: string | null;
  summary: string | null;
  body: string | null;
  cover_image_id: string | null;
  status: Status;
  is_featured: boolean;
  sort_order: number;
}

// Set in .env.local / .env.production — the PHP image service on SiteGround
// (php/api/upload.php, php/api/delete.php). See PLAN.md §2.5 and §6.2: it
// authenticates via the caller's Supabase access token, never holds the
// service role key, and never trusts a client-supplied filename.
const UPLOAD_API = process.env.NEXT_PUBLIC_UPLOAD_API_URL;

// Browser resizes before upload — keeps PHP's Imagick memory use sane on a
// 24MP source and makes uploads over bad wifi actually complete (PLAN.md
// §2.5 step 1).
const MAX_LONG_EDGE = 3000;

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function imageUrl(storagePath: string, width: number) {
  return `/${storagePath}-${width}.webp`;
}

async function downsample(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  bitmap.close();
  if (!ctx) return file;
  ctx.drawImage(await createImageBitmap(file), 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", 0.92));
}

export default function PortfolioManager() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser
      .from("projects")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setProjects((data as Project[]) ?? []));
  }, []);

  async function createProject() {
    const title = "New Project";
    const nextSort = (projects?.at(-1)?.sort_order ?? 0) + 10;
    const { data, error } = await supabaseBrowser
      .from("projects")
      .insert({ slug: `${slugify(title)}-${Date.now()}`, title, category: "dealership", sort_order: nextSort })
      .select()
      .single();
    if (!error && data) {
      const project = data as Project;
      setProjects((prev) => [...(prev ?? []), project]);
      setSelectedId(project.id);
    }
  }

  if (!projects) return <div className="admin-screen">Loading portfolio…</div>;
  const selected = projects.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="admin-screen admin-portfolio">
      <h1>Portfolio</h1>
      {!UPLOAD_API && (
        <p className="admin-error">
          NEXT_PUBLIC_UPLOAD_API_URL isn&apos;t set — image upload and delete are disabled until it is.
        </p>
      )}

      <div className="admin-leads-layout">
        <ul className="admin-leads-list">
          <li style={{ padding: 10 }}>
            <button className="admin-btn" onClick={createProject} style={{ width: "100%" }}>
              + New project
            </button>
          </li>
          {projects.length === 0 && <li className="admin-empty">No projects yet.</li>}
          {projects.map((p) => (
            <li key={p.id}>
              <button
                className={`admin-lead-row${selectedId === p.id ? " active" : ""}`}
                onClick={() => setSelectedId(p.id)}
              >
                <span className="admin-lead-name">{p.title}</span>
                <span className="admin-lead-meta">{p.category}</span>
                <span className={`admin-status-pill admin-status-${p.status}`}>{p.status}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="admin-lead-detail">
          {!selected && <p className="admin-empty">Select a project, or create a new one.</p>}
          {selected && (
            <ProjectEditor
              key={selected.id}
              project={selected}
              onSaved={(updated) => setProjects((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? prev)}
              onDeleted={(id) => {
                setProjects((prev) => prev?.filter((p) => p.id !== id) ?? prev);
                setSelectedId(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Keyed by project.id from the parent, so switching the selected project
// remounts this component with fresh initial state instead of needing an
// effect to resync `local` — same pattern ServicesEditor's ServiceCard
// already uses, and it sidesteps the set-state-in-effect cascading-render
// footgun entirely.
function ProjectEditor({
  project,
  onSaved,
  onDeleted,
}: {
  project: Project;
  onSaved: (project: Project) => void;
  onDeleted: (id: string) => void;
}) {
  const [local, setLocal] = useState(project);
  const [images, setImages] = useState<ProjectImage[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabaseBrowser
      .from("project_images")
      .select("*")
      .eq("project_id", project.id)
      .order("sort_order")
      .then(({ data }) => setImages((data as ProjectImage[]) ?? []));
  }, [project.id]);

  async function deleteProject() {
    if (!confirm("Delete this project and all its images? This can't be undone.")) return;
    const { error: deleteError } = await supabaseBrowser.from("projects").delete().eq("id", local.id);
    if (!deleteError) onDeleted(local.id);
  }

  async function saveProject() {
    setSaving(true);
    setError("");
    const { error: saveError } = await supabaseBrowser
      .from("projects")
      .update({
        title: local.title,
        slug: local.slug,
        category: local.category,
        vehicle_year: local.vehicle_year,
        vehicle_make: local.vehicle_make,
        vehicle_model: local.vehicle_model,
        location: local.location,
        summary: local.summary,
        body: local.body,
        status: local.status,
        is_featured: local.is_featured,
      })
      .eq("id", local.id);
    setSaving(false);
    if (saveError) {
      // The DB's own published_needs_cover constraint is what actually
      // enforces this — this message just explains that failure in plain
      // language instead of surfacing the raw Postgres error.
      setError(
        local.status === "published" && !local.cover_image_id
          ? "A published project needs a cover image — set one below, then save again."
          : saveError.message,
      );
      return;
    }
    onSaved(local);
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !images) return;
    if (!UPLOAD_API) {
      setError("NEXT_PUBLIC_UPLOAD_API_URL isn't set — image upload is unavailable.");
      return;
    }
    setUploading(true);
    setError("");

    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setError("Your session expired — sign in again.");
      setUploading(false);
      return;
    }

    let lastSort = images.at(-1)?.sort_order ?? 0;
    let cover_image_id = local.cover_image_id;

    for (const file of Array.from(fileList)) {
      try {
        const blob = await downsample(file);
        const form = new FormData();
        form.append("project_id", local.id);
        form.append("file", blob, file.name);

        const res = await fetch(`${UPLOAD_API}/upload.php`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        });
        const result = await res.json();
        if (!res.ok || !result.ok) throw new Error(result.error || "Upload failed");

        lastSort += 10;
        const { data: inserted, error: insertError } = await supabaseBrowser
          .from("project_images")
          .insert({
            project_id: local.id,
            storage_path: result.storage_path,
            width: result.width,
            height: result.height,
            blur_data_url: result.blur_data_url,
            sort_order: lastSort,
          })
          .select()
          .single();
        if (insertError) throw new Error(insertError.message);

        const image = inserted as ProjectImage;
        setImages((prev) => [...(prev ?? []), image]);

        if (!cover_image_id) {
          cover_image_id = image.id;
          await supabaseBrowser.from("projects").update({ cover_image_id }).eq("id", local.id);
          const updated = { ...local, cover_image_id };
          setLocal(updated);
          onSaved(updated);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function deleteImage(image: ProjectImage) {
    if (!confirm("Delete this image? This can't be undone.")) return;

    if (UPLOAD_API) {
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        // Best-effort: the DB row is the source of truth for what the site
        // shows, so a stray orphaned file on disk isn't worth blocking on.
        await fetch(`${UPLOAD_API}/delete.php`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ storage_path: image.storage_path }),
        }).catch(() => {});
      }
    }

    await supabaseBrowser.from("project_images").delete().eq("id", image.id);
    setImages((prev) => prev?.filter((i) => i.id !== image.id) ?? prev);

    if (local.cover_image_id === image.id) {
      await supabaseBrowser.from("projects").update({ cover_image_id: null }).eq("id", local.id);
      const updated = { ...local, cover_image_id: null };
      setLocal(updated);
      onSaved(updated);
    }
  }

  async function setCover(image: ProjectImage) {
    const { error: coverError } = await supabaseBrowser
      .from("projects")
      .update({ cover_image_id: image.id })
      .eq("id", local.id);
    if (coverError) return;
    const updated = { ...local, cover_image_id: image.id };
    setLocal(updated);
    onSaved(updated);
  }

  async function moveImage(image: ProjectImage, dir: -1 | 1) {
    if (!images) return;
    const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((i) => i.id === image.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await Promise.all([
      supabaseBrowser.from("project_images").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabaseBrowser.from("project_images").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    setImages((prev) =>
      prev?.map((i) => {
        if (i.id === a.id) return { ...i, sort_order: b.sort_order };
        if (i.id === b.id) return { ...i, sort_order: a.sort_order };
        return i;
      }) ?? prev,
    );
  }

  return (
    <>
      <div className="admin-field-row">
        <div className="admin-field">
          <label>Title</label>
          <input value={local.title} onChange={(e) => setLocal({ ...local, title: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Slug</label>
          <input value={local.slug} onChange={(e) => setLocal({ ...local, slug: e.target.value })} />
        </div>
      </div>

      <div className="admin-field-row">
        <div className="admin-field">
          <label>Category</label>
          <select value={local.category} onChange={(e) => setLocal({ ...local, category: e.target.value as Category })}>
            <option value="dealership">Dealership</option>
            <option value="personal">Personal</option>
            <option value="event">Event</option>
          </select>
        </div>
        <div className="admin-field">
          <label>Status</label>
          <select value={local.status} onChange={(e) => setLocal({ ...local, status: e.target.value as Status })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div className="admin-field-row">
        <div className="admin-field">
          <label>Vehicle year</label>
          <input
            type="number"
            value={local.vehicle_year ?? ""}
            onChange={(e) => setLocal({ ...local, vehicle_year: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div className="admin-field">
          <label>Make</label>
          <input value={local.vehicle_make ?? ""} onChange={(e) => setLocal({ ...local, vehicle_make: e.target.value })} />
        </div>
        <div className="admin-field">
          <label>Model</label>
          <input value={local.vehicle_model ?? ""} onChange={(e) => setLocal({ ...local, vehicle_model: e.target.value })} />
        </div>
      </div>

      <div className="admin-field">
        <label>Location</label>
        <input value={local.location ?? ""} onChange={(e) => setLocal({ ...local, location: e.target.value })} />
      </div>

      <div className="admin-field">
        <label>Summary</label>
        <textarea rows={2} value={local.summary ?? ""} onChange={(e) => setLocal({ ...local, summary: e.target.value })} />
      </div>

      <div className="admin-field">
        <label>Body</label>
        <textarea rows={4} value={local.body ?? ""} onChange={(e) => setLocal({ ...local, body: e.target.value })} />
      </div>

      <label className="admin-checkbox-label">
        <input
          type="checkbox"
          checked={local.is_featured}
          onChange={(e) => setLocal({ ...local, is_featured: e.target.checked })}
        />
        Featured on homepage
      </label>

      {error && <p className="admin-error">{error}</p>}
      <div className="admin-service-actions">
        <button className="admin-btn admin-btn-primary" onClick={saveProject} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="admin-link-btn admin-link-danger" onClick={deleteProject}>
          Delete project
        </button>
      </div>

      <h2 className="admin-group-heading" style={{ marginTop: 32 }}>
        Images
      </h2>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={uploading || !UPLOAD_API || !images}
        onChange={(e) => handleUpload(e.target.files)}
      />
      {uploading && <p className="admin-hint">Uploading…</p>}
      {!images && <p className="admin-hint">Loading images…</p>}

      {images && (
        <div className="admin-image-grid">
          {images
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((img) => (
              <div className="admin-image-thumb" key={img.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl(img.storage_path, 400)} alt={img.alt_text ?? ""} />
                {local.cover_image_id === img.id && <span className="admin-cover-badge">Cover</span>}
                <div className="admin-image-actions">
                  {local.cover_image_id !== img.id && (
                    <button className="admin-link-btn" onClick={() => setCover(img)}>
                      Set cover
                    </button>
                  )}
                  <button className="admin-link-btn" onClick={() => moveImage(img, -1)}>
                    ←
                  </button>
                  <button className="admin-link-btn" onClick={() => moveImage(img, 1)}>
                    →
                  </button>
                  <button className="admin-link-btn admin-link-danger" onClick={() => deleteImage(img)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
