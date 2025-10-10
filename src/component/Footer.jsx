import { Link } from "react-router-dom";
import { Linkedin } from "lucide-react";
import "./Footer.css";


function Footer() {
  return (
    <footer className="footer">
      {/* Main Footer  */}
      <div className="footer-wrapper">
        <div className="footer-container">
          <div className="footer-main">
            {/* Brand Section */}
            <div className="footer-brand">
              <div className="brand-block">
                <h2 className="brand-title">
                  <img src="/NEFTIT FAVICON.png" alt="NEFTIT" className="brand-logo" />
                  NEFTIT
                </h2>
                <p className="brand-desc">
                  NEFTIT is a Web3 engagement platform designed to empower NFT projects<br />
                  and communities through gamified interactions.
                </p>
              </div>
            </div>

            {/* Links Section */}
            <div className="footer-links">
              {/* Company Links */}
              <div className="link-group">
                <h3 className="link-title">COMPANY</h3>
                <div className="link-list">
                  <div className="footer-link">About Us</div>
                  <div className="footer-link">Contact Us</div>
                  {/*<Link to="/partnership" className="footer-link">Partnership</Link>*/}
                </div>
              </div>

              {/* Support Section*/}
              <div className="link-group">
                <h3 className="link-title">SUPPORT</h3>
                <div className="link-list">
                <Link to="/docs/overview" className="footer-link">Docs</Link>
                <Link to="/docs/appendix/media-kit" className="footer-link">Media Kit</Link>
                <Link to="/docs/legal-compliance-risk/privacy-policy" className="footer-link">Privacy Policy</Link>
                </div>
              </div>

              {/* Social Section */}
              <div className="link-group">
                <h3 className="link-title">SOCIAL</h3>
                <div className="social-list">
                  <a href="#" className="social-item">
                    <img src="/x-social-media-round-icon.png" alt="Twitter" className="social-icon" />
                    <span className="social-text">Twitter</span>
                  </a>
                  <a href="#" className="social-item">
                    <img src="/discord-round-color-icon.png" alt="Discord" className="social-icon" />
                    <span className="social-text">Discord</span>
                  </a>
                  <a href="#" className="social-item">
                    <img src="/telegram-icon.png" alt="Telegram" className="social-icon" />
                    <span className="social-text">Telegram</span>
                  </a>
                  <a href="#" className="social-item">
                    <Linkedin size={16} className="social-icon-svg" />
                    <span className="social-text--wide">LinkedIn</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="footer-bottom">
            <p className="copyright">© {new Date().getFullYear()} NEFTIT | <span>All Rights Reserved</span></p>
          </div>

          {/* Logo at bottom */}
          <div className="footer-logo-row">
            <img
              src="/neftitFont.png"
              alt="NEFTIT"
              className="footer-logo-bottom"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

