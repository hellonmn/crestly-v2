import { Link, useNavigate } from "react-router-dom";
import { CrestlyLogo, Icon } from "@crestly/icons";
import { authStore, useAuth } from "@/lib/auth-store";
import { BrandDot } from "@/components/BrandDot";
import { SpotlightTriggerHint, useOpenSpotlight } from "@/components/Spotlight";

/**
 * Mobile top app bar. CSS in components.css hides it ≥960px.
 * Matches erp/includes/header.php :: <header class="topbar">.
 */
export function Topbar({ schoolName }: { schoolName: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const openSpotlight = useOpenSpotlight();

  function logout() {
    if (!window.confirm("Log out?")) return;
    authStore.clear();
    navigate("/login", { replace: true });
  }

  return (
    <header className="topbar">
      <Link to="/" className="topbar__brand" style={{ textDecoration: "none", color: "inherit" }}>
        <CrestlyLogo width={28} height={28} />
        <span className="topbar__brand-name">
          {schoolName}
          <BrandDot />
        </span>
      </Link>

      {user && (
        <div style={{ marginLeft: "auto", marginRight: 8 }}>
          <SpotlightTriggerHint onOpen={openSpotlight} />
        </div>
      )}

      {user ? (
        <button
          type="button"
          onClick={logout}
          className="topbar__user"
          title={`Log out of ${user.name}`}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit" }}
        >
          <span className="topbar__user-avi">{user.name?.[0]?.toUpperCase() ?? "?"}</span>
          <span className="topbar__user-name">{user.name?.split(" ")[0]}</span>
          <Icon name="logout" size={14} />
        </button>
      ) : (
        <Link to="/login" className="topbar__user">
          <span className="topbar__user-avi" style={{ background: "var(--cream)", color: "var(--ink)" }}>
            ?
          </span>
          <span className="topbar__user-name">Log in</span>
        </Link>
      )}
    </header>
  );
}
