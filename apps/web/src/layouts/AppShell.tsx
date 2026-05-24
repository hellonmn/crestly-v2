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
   desktop (≥960px) because the sidebar carries the user widget there.
   We've moved the user widget to the topbar at all viewports, so:
   re-show the topbar everywhere AND hide its brand on desktop so it
   doesn't duplicate the sidebar's brand block. */
const SHELL_OVERRIDES_CSS = `
  @media (min-width: 960px) {
    .topbar {
      display: flex !important;
      position: sticky;
      top: 0;
      z-index: 50;
      justify-content: flex-end;        /* user widget pinned right */
      padding: 8px 20px;
      background: var(--white);
      border-bottom: 1px solid var(--rule);
    }
    /* Hide the small "Crestly." brand inside the topbar on desktop —
       the sidebar brand-block already shows the full school name. */
    .topbar .topbar__brand { display: none; }
  }

  /* On mobile (<960px) the sidebar slides over as a drawer, so the
     topbar's brand is the only visible school identity. */
  @media (max-width: 959.98px) {
    .topbar .topbar__brand { display: inline-flex; align-items: center; gap: 8px; }
  }
`;
