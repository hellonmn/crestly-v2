import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { InstallPwaBanner } from "@/components/InstallPwaBanner";

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
      <footer className="app-credit" role="contentinfo">
        Powered by <strong>Shadowbiz Startups Developer</strong>
        <span className="app-credit__dot" />
      </footer>
      <InstallPwaBanner />
    </>
  );
}
