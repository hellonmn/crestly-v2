import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { useAuth } from "@/lib/auth-store";

export function DashboardPage() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();

  return (
    <>
      <PageHead
        group="HOME"
        meta={today}
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"}`}
        lede={`${user?.schoolName ?? "Your school"} · signed in as ${user?.roleName ?? "—"}.`}
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mustard" icon="students" label="ACTIVE STUDENTS" value="—" delta="Loading…" />
        <StatTile tint="mint" icon="attendance" label="TODAY ATTENDANCE" value="—" delta="Loading…" />
        <StatTile tint="rose" icon="rupee" label="THIS MONTH INCOME" value="—" delta="Loading…" />
        <StatTile tint="wheat" icon="approvals" label="PENDING APPROVALS" value="—" delta="Loading…" />
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div className="display-s" style={{ marginBottom: 4 }}>
              Phase 1 reference module is live
            </div>
            <p className="lede" style={{ margin: 0 }}>
              Open <b>Students</b> in the sidebar to see the end-to-end pattern the remaining modules will be ported against.
            </p>
          </div>
        </div>
        <ul style={{ paddingLeft: 18, color: "var(--ink-60)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
          <li>
            UI: <code className="mono">apps/web/src/pages/students</code> — list / view / edit using the CDS classes.
          </li>
          <li>
            API: <code className="mono">apps/api/src/students</code> — Nest controller + Prisma service.
          </li>
          <li>
            Shared types: <code className="mono">packages/shared/src/students.ts</code> — Zod schemas reused by api / web / mobile.
          </li>
        </ul>
      </div>
    </>
  );
}
