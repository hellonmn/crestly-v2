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
   We've moved the user widget to the topbar across all viewports per
   the latest design call, so re-show the topbar at every width and
   pad the desktop layout to clear it. */
const SHELL_OVERRIDES_CSS = `
  @media (min-width: 960px) {
    .topbar {
      display: flex !important;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .app {
      /* Add a tiny top gap so the sticky topbar doesn't overlap the
         scroll edge of the main column. */
      padding-top: 0;
    }
  }
`;
