export default function Footer({ companyName, tagline }: { companyName: string; tagline: string }) {
  return (
    <footer>
      <div className="wrap footer-row">
        <div>
          <span className="brand-text">{companyName}</span>
          <div className="fine">
            {tagline} · © {new Date().getFullYear()}
          </div>
        </div>
        <div className="footer-links">
          <a href="#home">Home</a>
          <a href="#services">Services</a>
          <a href="#portfolio">Portfolio</a>
          <a href="#contact">Contact</a>
        </div>
      </div>
    </footer>
  );
}
