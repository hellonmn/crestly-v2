import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { InstallPwaBanner } from "@/components/InstallPwaBanner";
import { Spotlight } from "@/components/Spotlight";

/**
 * Full Crestly app shell. The class names + DOM structure mirror
 * erp/includes/header.php + footer.php so the CSS imported from
 * @crestly/design (verbatim from /erp/assets/css/) applies identically.
 *
 * Pieces still to land here (Batch A.3 follow-up):
 *  - Mobile drawer open/close JS + scrim
 *  - Bottom-nav (3 role-aware tabs + More)
 *  - FAB (when child page sets it)
 *  - Install banner / update banner / PWA registration
 */
export function AppShell({ schoolName = "Crestly" }: { schoolName?: string }) {
  // TODO: hydrate from /api/auth/me → school.name + per-tenant brand override
  // <style id="school-theme">:root{--orange:...}</style>
  useEffect(() => {
    // Reveal hook from PHP — keeps things consistent if a stylesheet ever lags.
    document.documentElement.classList.add("css-ready");
  }, []);

  return (
    <>
      <Topbar schoolName={schoolName} />
      <div className="scrim" id="drawer-scrim" aria-hidden="true" />
      <div className="app">
        <Sidebar schoolName={schoolName} />
        <main className="app__main">
          <Outlet />
        </main>
      </div>
      <InstallPwaBanner />
      <Spotlight />
      <style>{SHELL_OVERRIDES_CSS}</style>
    </>
  );
}

/* Local overrides — by default @crestly/design hides the topbar on
   desktop (≥960px) because the original CSS expected the sidebar to
   carry the user widget there. We've moved both the user widget AND
   the brand-block into the topbar across every viewport. */
const SHELL_OVERRIDES_CSS = `
  /* Kill the dark band at the top once and for all. The default
     stylesheet leaves <html> transparent which lets the platform/
     browser default (often a dark theme) bleed in above sticky
     elements. Force every layer white at the very top. */
  html, body { background: var(--white); }
  body { min-height: 100vh; }
  /* A zero-pixel ::before just anchors the body's bg colour at the
     top of the viewport even when the page is empty. */
  body::before {
    content: "";
    position: fixed;
    inset: 0 0 auto 0;
    height: 1px;
    background: var(--white);
    z-index: 100;
    pointer-events: none;
  }

  /* The main content area keeps the cream-soft surface. */
  .app, .app__main { background: var(--cream-soft); }

  @media (min-width: 960px) {
    .topbar {
      display: flex !important;
      align-items: center;
      gap: 12px;
      position: sticky;
      top: 0;
      z-index: 50;
      padding: 10px 20px;
      background: var(--white);
      border-bottom: 1px solid var(--rule);
    }
    .topbar .topbar__brand { flex: 0 0 auto; }

    /* Sidebar's huge brand-block is redundant on desktop — only show
       it inside the mobile drawer. */
    .app__nav .brand-block--mobile-only { display: none; }
    .app__nav { padding-top: 12px; }
  }

  @media (max-width: 959.98px) {
    .app__nav .brand-block--mobile-only { display: flex; }
  }
`;
