import { Navigate, useNavigate } from "react-router-dom";
import { CrestlyLogo, Icon } from "@crestly/icons";
import { parentAuthStore, useParentAuth } from "@/lib/parent-auth-store";
import { BrandDot } from "@/components/BrandDot";

/* ============================================================
   Parent portal home — placeholder.

   This is the destination after successful login. For now it
   just confirms who's logged in and lists the kids; subsequent
   commits will replace the big "Coming next" tiles with real
   attendance / fees / exams / diary / timetable widgets.
   ============================================================ */

export function ParentHomePage() {
  const { token, kids, parentLabel } = useParentAuth();
  const navigate = useNavigate();

  if (!token) {
    return <Navigate to="/parent/login" replace />;
  }

  function logout() {
    parentAuthStore.clear();
    navigate("/parent/login", { replace: true });
  }

  return (
    <>
      <style>{HOME_CSS}</style>
      <div className="ph">
        <header className="ph__top">
          <div className="ph__brand">
            <div className="ph__brand-logo" aria-hidden="true">
              <CrestlyLogo width={22} height={22} />
            </div>
            <div>
              <div className="ph__brand-name">Crestly<BrandDot /></div>
              <div className="ph__brand-sub">PARENT PORTAL</div>
            </div>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
            <Icon name="logout" size={13} /> Log out
          </button>
        </header>

        <main className="ph__main">
          <section className="ph__hello">
            <span className="label" style={{ color: "var(--orange-deep, var(--orange))" }}>WELCOME</span>
            <h1 className="ph__hello-h">Hello!</h1>
            <p className="muted ph__hello-p">{parentLabel}</p>
          </section>

          <section className="ph__kids">
            <h2 className="ph__sec-h">
              Your {kids.length === 1 ? "child" : "children"}
            </h2>
            <div className="ph__kids-grid">
              {kids.map((k) => (
                <article key={k.srNumber} className="ph__kid">
                  <div className="ph__kid-avatar">{initials(k.studentName)}</div>
                  <div className="ph__kid-body">
                    <div className="ph__kid-name">{k.studentName}</div>
                    <div className="muted body-s">
                      {k.classLabel}
                      {k.dob && ` · DOB ${fmtDate(k.dob)}`}
                      {k.isHostel && (
                        <>{" · "}<span className="pill pill--wheat" style={{ fontSize: 9 }}>HOSTEL</span></>
                      )}
                    </div>
                    <div className="ph__kid-sr mono">SR {String(k.srNumber).padStart(4, "0")}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="ph__features">
            <h2 className="ph__sec-h">Coming next</h2>
            <div className="ph__feat-grid">
              {[
                { icon: "attendance",   t: "Attendance",  s: "Monthly view + alerts" },
                { icon: "fee-ledger",   t: "Fees",        s: "Pay online + receipts" },
                { icon: "exams",        t: "Exams",       s: "Marks + report cards" },
                { icon: "diary",        t: "Daily diary", s: "Today's homework" },
                { icon: "timetable",    t: "Timetable",   s: "Weekly schedule" },
                { icon: "phone",        t: "Contact",     s: "Reach the school" },
              ].map((f) => (
                <div key={f.t} className="ph__feat">
                  <span className="ph__feat-ico"><Icon name={f.icon as never} size={16} /></span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{f.t}</div>
                    <div className="muted body-s">{f.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "?").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const HOME_CSS = `
  .ph { min-height: 100vh; background: var(--cream); display: flex; flex-direction: column; }
  .ph__top {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 22px;
    background: var(--white);
    border-bottom: 1px solid var(--rule);
  }
  .ph__brand { display: flex; align-items: center; gap: 12px; }
  .ph__brand-logo {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: var(--ink); color: var(--cream);
    display: grid; place-items: center;
  }
  .ph__brand-name {
    font-family: var(--font-display, system-ui);
    font-weight: 900; font-size: 17px; letter-spacing: -.02em;
  }
  .ph__brand-sub {
    font-family: var(--font-mono, monospace);
    font-size: 9.5px; letter-spacing: .12em;
    color: var(--ink-40); text-transform: uppercase;
  }

  .ph__main { max-width: 720px; width: 100%; margin: 0 auto; padding: 28px 22px 64px; }

  .ph__hello { margin-bottom: 28px; }
  .ph__hello-h {
    font-family: var(--font-display, system-ui);
    font-weight: 800; font-size: 28px;
    letter-spacing: -.02em;
    margin: 4px 0 4px;
  }
  .ph__hello-p { margin: 0; font-size: 13.5px; }

  .ph__sec-h {
    font-family: var(--font-mono, monospace);
    text-transform: uppercase;
    letter-spacing: .12em;
    font-size: 11px;
    color: var(--ink-60);
    margin: 0 0 10px;
  }

  .ph__kids { margin-bottom: 28px; }
  .ph__kids-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 560px) { .ph__kids-grid { grid-template-columns: 1fr 1fr; } }

  .ph__kid {
    display: flex; gap: 12px; align-items: center;
    padding: 14px;
    background: var(--white);
    border: 1px solid var(--rule);
    border-radius: 14px;
    transition: border-color .15s ease, transform .15s ease;
  }
  .ph__kid:hover { border-color: var(--orange); transform: translateY(-1px); }
  .ph__kid-avatar {
    width: 44px; height: 44px; flex-shrink: 0;
    border-radius: 50%;
    background: var(--tint-wheat, #fcebd6);
    color: var(--orange-deep, #b8410b);
    display: grid; place-items: center;
    font-weight: 800; font-size: 14px;
  }
  .ph__kid-body { flex: 1; min-width: 0; }
  .ph__kid-name { font-weight: 700; font-size: 14.5px; }
  .ph__kid-sr {
    margin-top: 4px;
    font-size: 10.5px;
    color: var(--ink-40);
    letter-spacing: .04em;
  }

  .ph__features { }
  .ph__feat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
  }
  .ph__feat {
    display: flex; align-items: center; gap: 10px;
    padding: 12px;
    background: var(--white);
    border: 1px solid var(--rule);
    border-radius: 10px;
    opacity: .8;
  }
  .ph__feat-ico {
    width: 32px; height: 32px;
    border-radius: 8px;
    background: var(--cream-soft);
    color: var(--orange-deep, var(--orange));
    display: grid; place-items: center;
    flex-shrink: 0;
  }
`;
