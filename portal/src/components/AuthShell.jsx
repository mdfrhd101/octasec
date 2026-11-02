import BrandLockup from "./BrandLockup.jsx";
import HudField from "./HudField.jsx";

// The sign-in screens' frame: the website's background, a logo back to the website, the panel.
export default function AuthShell({ children }) {
  return (
    <div className="login">
      <HudField />
      <a className="login-home" href="/" aria-label="OctaSec website" title="Go to the OctaSec website">
        <BrandLockup height={30} />
      </a>
      <div className="login-card card">
        <div className="brand"><span>PORTAL</span></div>
        {children}
      </div>
    </div>
  );
}
