import SmoothScroll from "@/components/layout/SmoothScroll";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import VideoHero from "@/components/hero/VideoHero";
import Bio from "@/components/home/Bio";
import Services from "@/components/services/Services";
import SocialContent from "@/components/social/SocialContent";
import Portfolio from "@/components/portfolio/Portfolio";
import Contact from "@/components/contact/Contact";

export default function Home() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only absolute left-4 top-4 z-50 bg-panel px-4 py-2">
        Skip to content
      </a>

      <SmoothScroll />
      <Header />

      <main id="main" tabIndex={-1}>
        <VideoHero />
        <Bio />
        <Services />
        <SocialContent />
        <Portfolio />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
