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
        <div className="topbar__spotlight">
          <SpotlightTriggerHint onOpen={openSpotlight} />
        </div>
      )}

      {user ? (
        <button
          type="button"
          onClick={logout}
          className="topbar__user topbar__user--rich"
          title={`Log out of ${user.name}`}
        >
          <span className="topbar__user-avi">{user.name?.[0]?.toUpperCase() ?? "?"}</span>
          <span className="topbar__user-stack">
            <span className="topbar__user-name">{user.name}</span>
            <span className="topbar__user-role">{user.roleName ?? "—"}</span>
          </span>
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

      <style>{TOPBAR_LOCAL_CSS}</style>
    </header>
  );
}

const TOPBAR_LOCAL_CSS = `
  .topbar__spotlight { margin-left: auto; margin-right: 12px; }
  /* On phones the spotlight hint is too wide — collapse it to the
     icon-only ⌘K shortcut hint. */
  @media (max-width: 600px) {
    .topbar__spotlight .spotlight-trigger__label { display: none; }
    .topbar__spotlight .spotlight-trigger { padding: 6px 8px; }
  }

  .topbar__user--rich {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    background: var(--cream-soft);
    border: 1px solid var(--rule);
    border-radius: 10px;
    cursor: pointer;
    color: inherit;
    transition: background 120ms ease, border-color 120ms ease;
  }
  .topbar__user--rich:hover {
    background: var(--white);
    border-color: var(--orange);
  }
  .topbar__user-stack {
    display: flex;
    flex-direction: column;
    min-width: 0;
    text-align: left;
    line-height: 1.15;
  }
  .topbar__user-stack .topbar__user-name {
    font-weight: 600;
    font-size: 13px;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }
  .topbar__user-role {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--ink-60);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  /* On phones drop the name + role stack, keep just the avatar + logout. */
  @media (max-width: 600px) {
    .topbar__user-stack { display: none; }
    .topbar__user--rich { padding: 6px 8px; }
  }
`;
