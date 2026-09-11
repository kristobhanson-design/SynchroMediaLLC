import type { Metadata } from "next";
import AdminApp from "@/components/admin/AdminApp";
import "./admin.css";

// Not linked from the public site and excluded from robots.txt (see
// src/app/robots.ts) — this is belt-and-braces on top of that, since a
// draft's title still shouldn't end up in a search result if something
// crawls it directly.
export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
