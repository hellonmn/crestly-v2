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
  /* Eliminate any html/body gap behind the sticky topbar — both
     surfaces should share a colour so a 1-pixel rounding never shows
     a darker strip at the very top of the viewport. */
  html { background: var(--white); }
  body { background: var(--cream-soft); }

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
    /* Brand sits on the left at its natural width; user widget on
       the right via margin-left: auto on the spotlight container. */
    .topbar .topbar__brand { flex: 0 0 auto; }

    /* Sidebar's huge brand-block is redundant on desktop now —
       only show it inside the mobile drawer. */
    .app__nav .brand-block--mobile-only { display: none; }
    .app__nav { padding-top: 12px; }
  }

  @media (max-width: 959.98px) {
    .app__nav .brand-block--mobile-only { display: flex; }
  }
`;
