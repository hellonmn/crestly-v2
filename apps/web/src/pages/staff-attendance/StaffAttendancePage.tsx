import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { useStaffAttendance } from "./hooks";
import type { PunchType } from "@crestly/shared";

export function StaffAttendancePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [punchType, setPunchType] = useState<PunchType | "">("");
  const [zone, setZone] = useState<"all" | "in" | "outside">("all");

  const { data, isLoading } = useStaffAttendance({
    from: from || undefined,
    to: to || undefined,
    punchType: punchType || undefined,
    zone,
    pageSize: 100,
    page: 1,
  });

  return (
    <>
      <PageHead
        group="HR"
        title="Staff Attendance"
        lede="Punch log with geo + selfie audit."
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mint" icon="punch" label="PUNCH-INS" value={String(data?.punchIns ?? "—")} delta="" />
        <StatTile tint="rose" icon="punch" label="PUNCH-OUTS" value={String(data?.punchOuts ?? "—")} delta="" />
        <StatTile tint="wheat" icon="alert" label="OUTSIDE GEOFENCE" value={String(data?.outsideCount ?? "—")} delta="anomalies" />
        <StatTile tint="mustard" icon="staff-attendance" label="TOTAL EVENTS" value={String(data?.total ?? "—")} delta="" />
      </div>

      <div className="toolbar card">
        <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ maxWidth: 160 }} />
        <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ maxWidth: 160 }} />
        <select className="select" value={punchType} onChange={(e) => setPunchType(e.target.value as PunchType | "")}>
          <option value="">All types</option>
          <option value="in">Punch In</option>
          <option value="out">Punch Out</option>
        </select>
        <select className="select" value={zone} onChange={(e) => setZone(e.target.value as "all" | "in" | "outside")}>
          <option value="all">All zones</option>
          <option value="in">In geofence</option>
          <option value="outside">Outside</option>
        </select>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Staff</th>
              <th>Type</th>
              <th>Distance</th>
              <th>Zone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>}
            {data?.items.map((p) => (
              <tr key={p.id} style={p.isOutside ? { background: "var(--error-soft)" } : undefined}>
                <td className="mono" style={{ fontSize: 12 }}>
                  {new Date(p.punchedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="td-name">
                  {p.userName}
                  <div className="muted body-s">{p.designation ?? p.department ?? "—"}</div>
                </td>
                <td>
                  <span className={`pill ${p.punchType === "in" ? "pill--success" : "pill--neutral"}`}>
                    <span className="pill__dot" />
                    {p.punchType.toUpperCase()}
                  </span>
                </td>
                <td className="mono">{p.distanceM != null ? `${p.distanceM} m` : "—"}</td>
                <td>
                  <span className={`pill ${p.isOutside ? "pill--error" : "pill--mint"}`}>
                    {p.isOutside ? "OUTSIDE" : "IN " + p.geofenceType.toUpperCase()}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <Link to={`/staff-attendance/${p.id}`} className="btn btn--ghost btn--sm">
                    <Icon name="search" size={12} /> Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
