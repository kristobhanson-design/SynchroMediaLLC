import SmoothScroll from "@/components/layout/SmoothScroll";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import VideoHero from "@/components/hero/VideoHero";
import Bio from "@/components/home/Bio";
import Services from "@/components/services/Services";
import SocialContent from "@/components/social/SocialContent";
import Portfolio from "@/components/portfolio/Portfolio";
import Contact from "@/components/contact/Contact";
import { getSiteContent, getServices, getProjects } from "@/lib/content";

// Async Server Component: runs at `next build` time only (static export —
// see next.config.ts), reading from Supabase via the anon-role build-time
// client (src/lib/supabase/server.ts). Every string below has a fallback
// for the same reason the admin's ContentEditor doesn't validate emptiness
// server-side: a blank or missing site_content row shouldn't produce a
// blank section on the live site.
export default async function Home() {
  const [content, services, projects] = await Promise.all([getSiteContent(), getServices(), getProjects()]);

  const socialLinks = {
    instagram: content["social.instagram_url"] || "https://www.instagram.com/synchromediaa",
    tiktok: content["social.tiktok_url"] || "https://www.tiktok.com/@synchromediaa",
    facebook: content["social.facebook_url"] || "https://www.facebook.com/profile.php?id=61593813066922",
    youtube: content["social.youtube_url"] || "https://www.youtube.com/@SynchroMediaLLC",
  };
  const email = content["global.email"] || "Khanson@SynchroMediaLLC.com";
  const ownerName = content["global.owner_name"] || "Kristopher Hanson";

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only absolute left-4 top-4 z-50 bg-panel px-4 py-2">
        Skip to content
      </a>

      <SmoothScroll />
      <Header email={email} ownerName={ownerName} socialLinks={socialLinks} />

      <main id="main" tabIndex={-1}>
        <VideoHero
          headline={content["home.hero.headline"] || "Cars, shot to sell."}
          subhead={content["home.hero.subhead"] || "Content, made to share."}
        />
        <Bio
          eyebrow={content["home.bio.eyebrow"] || "Why Us?"}
          quote={content["home.bio.quote"] || ""}
          ownerName={content["home.bio.owner_name"] || "Kris Hanson"}
          ownerTitle={content["home.bio.owner_title"] || "Owner"}
        />
        <Services
          eyebrow={content["services.heading"] || "Services"}
          packages={services.packages}
          styles={services.styles}
        />
        <SocialContent
          eyebrow={content["social_content.eyebrow"] || "Social Content"}
          headline={content["social_content.headline"] || "Built for the feed."}
          body={content["social_content.body"] || ""}
        />
        <Portfolio
          eyebrow={content["portfolio.eyebrow"] || "Portfolio"}
          headline={content["portfolio.headline"] || "The Catalog"}
          body={content["portfolio.body"] || ""}
          projects={projects}
        />
        <Contact
          eyebrow={content["contact.eyebrow"] || "Contact"}
          heading={content["contact.heading"] || "Tell us about the shoot."}
          body={content["contact.body"] || ""}
          successMessage={content["contact.success"] || "Got it — I'll be in touch within one business day."}
          email={email}
          ownerName={ownerName}
        />
      </main>

      <Footer companyName={content["global.company_name"] || "Synchro Media LLC"} tagline={content["footer.tagline"] || "Metro Atlanta, GA"} />
    </>
  );
}
