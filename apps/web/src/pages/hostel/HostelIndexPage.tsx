import { Link } from "react-router-dom";
import { Icon, type IconName } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { useHostelOverview } from "./hooks";

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

export function HostelIndexPage() {
  const { data, isLoading } = useHostelOverview();

  return (
    <>
      <PageHead group="RECORDS" title="Hostel" lede="Boarders, rooms, occupancy and annual billing across blocks." />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mustard" icon="hostel" label="BOARDERS" value={String(data?.boarders ?? "—")} delta="active students" />
        <StatTile tint="sky" icon="features" label="ROOMS" value={String(data?.totalRooms ?? "—")} delta="" />
        <StatTile tint="mint" icon="check" label="OCCUPANCY" value={`${data?.occupancyPct ?? "—"}%`} delta="" />
        <StatTile tint="rose" icon="rupee" label="ANNUAL BILLING" value={data ? fmt(data.annualBilling) : "—"} delta="this session" />
      </div>

      {isLoading && <p className="muted">Loading…</p>}

      <div className="grid grid--cols-2 grid--gap-sm">
        {data?.blocks.map((b) => (
          <div key={b.block} className="card">
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
              <div className="display-s" style={{ fontSize: 22 }}>{b.block} block</div>
              <span className="pill pill--wheat">{b.rooms} rooms · {b.capacity} beds</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
              <span className="muted">Occupancy</span>
              <span className="mono">{b.occupied} / {b.capacity} · {b.pct}%</span>
            </div>
            <div style={{ height: 8, background: "var(--cream-soft)", borderRadius: 999, marginBottom: 12 }}>
              <div style={{ width: `${b.pct}%`, height: "100%", background: b.pct > 90 ? "var(--error)" : "var(--success)", borderRadius: 999 }} />
            </div>
            <Link to={`/hostel/rooms?block=${b.block}`} className="btn btn--ghost btn--sm">
              <Icon name="features" size={14} /> View rooms
            </Link>
          </div>
        ))}
      </div>

      <div className="grid grid--cols-4 grid--gap-sm">
        <Shortcut to="/hostel/boarders" icon="users" title="Boarders roster" sub="Search by name, class, block" />
        <Shortcut to="/hostel/fees" icon="rupee" title="Fees" sub="One-time, lodging, common" />
        <Shortcut to="/hostel/schedule" icon="calendar" title="Schedule & Rules" sub="Daily rhythm + policies" />
        <Shortcut to="/team?department=Hostel" icon="team" title="Hostel staff" sub="Wardens, mess, security" />
      </div>
    </>
  );
}

function Shortcut({ to, icon, title, sub }: { to: string; icon: IconName; title: string; sub: string }) {
  return (
    <Link to={to} className="card" style={{ textDecoration: "none", color: "inherit", display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div className="stat-tile__icon icon-tint-wheat">
        <Icon name={icon} size={20} />
      </div>
      <div>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>
        <p className="muted body-s" style={{ margin: 0 }}>{sub}</p>
      </div>
    </Link>
  );
}
