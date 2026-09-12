import { supabaseServer } from "@/lib/supabase/server";
import { variantUrl } from "@/lib/images";

/**
 * Server-side content fetchers — called only from Server Components
 * (page.tsx, layout.tsx) during `next build`. See src/lib/supabase/server.ts:
 * this is the anon-role, unauthenticated client, so it only ever sees what
 * the public-read RLS policies allow (published projects, active services,
 * all of site_content — supabase/migrations/20260820163901_rls_policies.sql).
 *
 * Until 2026-09-12 the public site never called any of this — every public
 * component had its copy, services, and portfolio hardcoded from the
 * original build, so admin edits saved to Supabase never showed up on a
 * republish. See project-admin-panel memory.
 */

export type SiteContent = Record<string, string>;

export async function getSiteContent(): Promise<SiteContent> {
  const { data, error } = await supabaseServer.from("site_content").select("key, value");
  if (error) {
    console.error("getSiteContent failed", error);
    return {};
  }
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

export interface ServiceItem {
  slug: string;
  name: string;
  audience: string | null;
  blurb: string | null;
  bullets: string[];
}

export interface Services {
  packages: ServiceItem[];
  styles: ServiceItem[];
}

export async function getServices(): Promise<Services> {
  const { data, error } = await supabaseServer
    .from("services")
    .select("slug, kind, name, audience, blurb, bullets")
    .eq("is_active", true)
    .order("kind")
    .order("sort_order");
  if (error) {
    console.error("getServices failed", error);
    return { packages: [], styles: [] };
  }
  const rows = (data ?? []) as (ServiceItem & { kind: "package" | "style" })[];
  return {
    packages: rows.filter((r) => r.kind === "package"),
    styles: rows.filter((r) => r.kind === "style"),
  };
}

export interface ProjectImage {
  url: string;
  alt: string;
}

export interface ProjectSummary {
  slug: string;
  title: string;
  category: "dealership" | "personal" | "event";
  location: string | null;
  isFeatured: boolean;
  coverUrl: string;
  images: ProjectImage[];
}

// New admin uploads store an extension-less base (php/api/upload.php writes
// "uploads/<project_id>/<uuid>", with variants alongside as "-<width>.webp").
// The 9 projects seeded from the original hardcoded build predate that
// convention and store the real, complete path instead — see the seed
// migration's own comment on this. Both live in the same column, so this is
// how the two are told apart at read time.
function resolveImageUrl(storagePath: string, width: number): string {
  if (/\.(jpe?g|png|webp)$/i.test(storagePath)) {
    return `/${storagePath.replace(/^\/+/, "")}`;
  }
  return variantUrl(storagePath, width);
}

export async function getProjects(): Promise<ProjectSummary[]> {
  // The FK to disambiguate is spelled out explicitly: projects and
  // project_images have two foreign keys between them (project_images ->
  // projects via project_id, and projects -> project_images via
  // cover_image_id), so PostgREST can't infer which one this embed means
  // without help — a plain `project_images(...)` 500s with "more than one
  // relationship was found" (confirmed at build time, not guessed).
  const { data, error } = await supabaseServer
    .from("projects")
    .select(
      "slug, title, category, location, is_featured, cover_image_id, project_images!project_images_project_id_fkey(id, storage_path, alt_text, sort_order)",
    )
    .eq("status", "published")
    .order("sort_order");
  if (error) {
    console.error("getProjects failed", error);
    return [];
  }

  return (data ?? []).map((row) => {
    type RawImage = { id: string; storage_path: string; alt_text: string | null; sort_order: number };
    const rawImages = (row.project_images as RawImage[]).slice().sort((a, b) => a.sort_order - b.sort_order);

    const images = rawImages.map((img) => ({
      url: resolveImageUrl(img.storage_path, 1440),
      alt: img.alt_text || row.title,
    }));

    const coverIndex = rawImages.findIndex((img) => img.id === row.cover_image_id);
    const coverUrl = images[coverIndex === -1 ? 0 : coverIndex]?.url ?? "";

    return {
      slug: row.slug,
      title: row.title,
      category: row.category as ProjectSummary["category"],
      location: row.location,
      isFeatured: row.is_featured,
      coverUrl,
      images,
    };
  });
}
