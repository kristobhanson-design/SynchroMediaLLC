import type { Metadata } from "next";
import { Inter, Michroma } from "next/font/google";
import "./globals.css";

// next/font downloads at build time and self-hosts the files, so the deployed
// site makes no request to Google — faster, and no third-party font tracking.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
// Michroma ships one weight (400) — the hero headline, set uppercase and
// wide, doesn't need a bolder cut.
const michroma = Michroma({ variable: "--font-michroma", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  metadataBase: new URL("https://synchromediallc.com"),
  title: {
    default: "Synchro Media — Automotive Photography, Atlanta",
    template: "%s — Synchro Media",
  },
  description:
    "Automotive photography and video for dealerships, private owners and car events across metro Atlanta.",
  openGraph: {
    type: "website",
    siteName: "Synchro Media",
    locale: "en_US",
    url: "https://synchromediallc.com",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${michroma.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
