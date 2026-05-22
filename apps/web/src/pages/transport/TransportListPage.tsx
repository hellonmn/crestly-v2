import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { useTransportSlabs } from "@/pages/fee-structure/hooks";
import { usePickupPoints } from "./hooks";

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

export function TransportListPage() {
  const [q, setQ] = useState("");
  const { data, isLoading } = usePickupPoints(q || undefined);
  const { data: slabs } = useTransportSlabs();

  return (
    <>
      <PageHead
        group="LOGISTICS"
        title="Transport"
        lede="Pickup points + students assigned + per-point revenue."
        actions={
          <>
            <Link to="/transport/slabs" className="btn btn--ghost btn--sm">
              <Icon name="features" size={14} /> Fee slabs
            </Link>
            <Link to="/transport/new" className="btn btn--primary btn--sm">
              <Icon name="plus" size={14} /> Add pickup
            </Link>
          </>
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="sky" icon="transport" label="PICKUP POINTS" value={String(data?.items.length ?? "—")} delta="" />
        <StatTile tint="mustard" icon="users" label="STUDENTS ON TRANSPORT" value={String(data?.totalStudents ?? "—")} delta="" />
        <StatTile tint="mint" icon="rupee" label="REVENUE" value={data ? fmt(data.totalRevenue) : "—"} delta="this session" />
        <StatTile tint="wheat" icon="features" label="DISTANCE SLABS" value={String(slabs?.length ?? "—")} delta="" />
      </div>

      <div className="toolbar card">
        <div className="search">
          <Icon name="search" size={14} />
          <input type="search" placeholder="Search pickup points…" value={q} onChange={(e) => setQ(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14 }} />
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Distance</th>
              <th>Slab</th>
              <th>Students</th>
              <th>Revenue</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>}
            {data?.items.map((p) => (
              <tr key={p.id}>
                <td className="td-sr mono">{p.id}</td>
                <td className="td-name">
                  <Link to={`/transport/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    {p.name}
                  </Link>
                </td>
                <td className="mono">{p.distanceKm != null ? `${p.distanceKm} km` : "—"}</td>
                <td>{p.slab ? <span className="cls-pill">{p.slab}</span> : <span className="muted">—</span>}</td>
                <td className="mono">{p.studentCount}</td>
                <td className="mono">{fmt(p.revenue)}</td>
                <td style={{ textAlign: "right" }}>
                  <Link to={`/transport/${p.id}`} className="btn btn--ghost btn--sm">
                    <Icon name="chev-right" size={12} /> Open
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
