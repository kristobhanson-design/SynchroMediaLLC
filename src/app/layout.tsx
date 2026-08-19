import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// next/font downloads at build time and self-hosts the files, so the deployed
// site makes no request to Google — faster, and no third-party font tracking.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
