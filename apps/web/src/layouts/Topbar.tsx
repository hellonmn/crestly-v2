import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CrestlyLogo, Icon } from "@crestly/icons";
import { authStore, useAuth } from "@/lib/auth-store";
import { BrandDot } from "@/components/BrandDot";
import { SpotlightTriggerHint, useOpenSpotlight } from "@/components/Spotlight";

/**
 * Top app bar. Sticky on every viewport. Shows:
 *   left   — Crestly logo + school name
 *   middle — flex spacer
 *   right  — Search (⌘K) trigger, then a profile chip that opens
 *            a small dropdown with My profile / Settings / Log out.
 */
export function Topbar({ schoolName }: { schoolName: string }) {
  const { user } = useAuth();
  const openSpotlight = useOpenSpotlight();

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
        <ProfileMenu name={user.name ?? "User"} roleName={user.roleName ?? null} userId={user.id ?? null} />
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

/* ------------------------------------------------------------------ */
/* Profile menu — click to open, outside-click / Esc to close          */
/* ------------------------------------------------------------------ */

function ProfileMenu({
  name, roleName, userId,
}: {
  name: string;
  roleName: string | null;
  userId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canSettings = (user?.permissions ?? []).includes("settings.manage") ||
                       user?.roleSlug === "admin" || user?.roleSlug === "principal";

  // Outside click + Esc to close
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }
  function logout() {
    setOpen(false);
    if (!window.confirm("Log out?")) return;
    authStore.clear();
    navigate("/login", { replace: true });
  }

  const initials = (name.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="topbar__profile" ref={ref}>
      <button
        type="button"
        className={`topbar__profile-btn ${open ? "is-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={name}
      >
        <span className="topbar__profile-avi">{initials}</span>
        <span className="topbar__profile-stack">
          <span className="topbar__profile-name">{name}</span>
          {roleName && <span className="topbar__profile-role">{roleName}</span>}
        </span>
        <span className="topbar__profile-chev" aria-hidden="true">
          <Icon name="chev-down" size={14} />
        </span>
      </button>

      {open && (
        <div className="topbar__profile-menu" role="menu">
          <div className="topbar__profile-menu-head">
            <span className="topbar__profile-avi" style={{ width: 40, height: 40, fontSize: 15 }}>{initials}</span>
            <div className="topbar__profile-stack" style={{ minWidth: 0 }}>
              <span className="topbar__profile-name" style={{ fontSize: 14 }}>{name}</span>
              {roleName && <span className="topbar__profile-role">{roleName}</span>}
            </div>
          </div>

          <div className="topbar__profile-sep" />

          {userId !== null && (
            <MenuItem icon="users" onClick={() => go(`/team/${userId}`)} label="My profile" sub="View your team record" />
          )}
          {canSettings && (
            <MenuItem icon="settings" onClick={() => go("/settings")} label="Settings" sub="School identity, geofence, punch" />
          )}
          <MenuItem icon="ledger" onClick={() => go("/sessions")} label="Sessions" sub="Switch academic year" />

          <div className="topbar__profile-sep" />

          <MenuItem
            icon="logout"
            onClick={logout}
            label="Log out"
            sub="End this session"
            danger
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon, label, sub, onClick, danger,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  sub?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`topbar__profile-item ${danger ? "is-danger" : ""}`}
      onClick={onClick}
    >
      <span className="topbar__profile-item-icon">
        <Icon name={icon} size={14} />
      </span>
      <span className="topbar__profile-item-text">
        <span className="topbar__profile-item-label">{label}</span>
        {sub && <span className="topbar__profile-item-sub">{sub}</span>}
      </span>
    </button>
  );
}

const TOPBAR_LOCAL_CSS = `
  .topbar__spotlight { margin-left: auto; margin-right: 12px; }
  @media (max-width: 600px) {
    .topbar__spotlight .spotlight-trigger__label { display: none; }
    .topbar__spotlight .spotlight-trigger { padding: 6px 8px; }
  }

  /* ── Profile button ───────────────────────────────────── */
  .topbar__profile {
    position: relative;
  }
  .topbar__profile-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 6px 8px 6px 8px;
    background: var(--cream-soft);
    border: 1px solid var(--rule);
    border-radius: 10px;
    cursor: pointer;
    color: inherit;
    font: inherit;
    transition: background 120ms ease, border-color 120ms ease;
  }
  .topbar__profile-btn:hover,
  .topbar__profile-btn.is-open {
    background: var(--white);
    border-color: var(--orange);
  }
  .topbar__profile-avi {
    width: 30px; height: 30px;
    border-radius: 50%;
    background: var(--ink);
    color: var(--cream);
    display: inline-flex; align-items: center; justify-content: center;
    font-weight: 700;
    font-size: 12px;
    flex-shrink: 0;
  }
  .topbar__profile-stack {
    display: flex; flex-direction: column;
    min-width: 0;
    line-height: 1.15;
    text-align: left;
  }
  .topbar__profile-name {
    font-weight: 600;
    font-size: 13px;
    color: var(--ink);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }
  .topbar__profile-role {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--ink-60);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-top: 1px;
  }
  .topbar__profile-chev {
    display: inline-flex;
    color: var(--ink-60);
    transition: transform 120ms ease;
  }
  .topbar__profile-btn.is-open .topbar__profile-chev { transform: rotate(180deg); }

  @media (max-width: 600px) {
    .topbar__profile-stack { display: none; }
    .topbar__profile-chev { display: none; }
    .topbar__profile-btn { padding: 6px; }
  }

  /* ── Dropdown menu ─────────────────────────────────────── */
  .topbar__profile-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 260px;
    background: var(--white);
    border: 1px solid var(--rule);
    border-radius: 12px;
    box-shadow: 0 16px 40px rgba(16,13,10,0.18), 0 4px 12px rgba(16,13,10,0.08);
    padding: 6px;
    z-index: 60;
    animation: profile-menu-in 120ms cubic-bezier(.2,.9,.3,1.1);
  }
  @keyframes profile-menu-in {
    from { opacity: 0; transform: translateY(-4px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)    scale(1); }
  }
  .topbar__profile-menu-head {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
  }
  .topbar__profile-sep {
    height: 1px;
    background: var(--rule);
    margin: 4px 0;
  }
  .topbar__profile-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 10px;
    background: transparent;
    border: 0;
    border-radius: 8px;
    color: var(--ink);
    cursor: pointer;
    font: inherit;
    text-align: left;
    transition: background 80ms ease;
  }
  .topbar__profile-item:hover {
    background: var(--cream-soft);
  }
  .topbar__profile-item.is-danger:hover {
    background: rgba(184, 53, 32, 0.06);
    color: var(--error);
  }
  .topbar__profile-item-icon {
    display: inline-flex;
    align-items: center; justify-content: center;
    width: 30px; height: 30px;
    border-radius: 8px;
    background: var(--cream);
    color: var(--ink-60);
    flex-shrink: 0;
  }
  .topbar__profile-item.is-danger .topbar__profile-item-icon {
    background: rgba(184, 53, 32, 0.1);
    color: var(--error);
  }
  .topbar__profile-item-text {
    display: flex; flex-direction: column;
    line-height: 1.2;
    min-width: 0;
  }
  .topbar__profile-item-label {
    font-weight: 600;
    font-size: 13px;
  }
  .topbar__profile-item-sub {
    font-size: 11px;
    color: var(--ink-60);
    margin-top: 1px;
  }
`;
