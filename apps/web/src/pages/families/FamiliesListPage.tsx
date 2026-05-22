import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { useFamilies } from "./hooks";
import { useAuth } from "@/lib/auth-store";

export function FamiliesListPage() {
  const { user } = useAuth();
  const canManage = (user?.permissions ?? []).includes("students.manage");
  const [q, setQ] = useState("");
  const { data, isLoading } = useFamilies({ q: q || undefined, page: 1, pageSize: 100 });

  return (
    <>
      <PageHead
        group="RECORDS"
        title="Sibling Families"
        lede="Multi-child families with automatic sibling-discount tracking for the current session."
        actions={
          canManage && (
            <Link to="/families/new" className="btn btn--primary btn--sm">
              <Icon name="plus" size={14} /> Add family
            </Link>
          )
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mustard" icon="families" label="FAMILIES" value={String(data?.totalFamilies ?? "—")} delta="" />
        <StatTile tint="mint" icon="students" label="ENROLLED SIBLINGS" value={String(data?.totalEnrolled ?? "—")} delta="" />
        <StatTile tint="sky" icon="features" label="RECEIVING DISCOUNT" value={String(data?.totalReceivingDiscount ?? "—")} delta="this session" />
        <StatTile tint="rose" icon="rupee" label="DISCOUNT GIVEN" value={data ? `₹${data.totalDiscountGiven.toLocaleString("en-IN")}` : "—"} delta="this session" />
      </div>

      <div className="toolbar card">
        <div className="search">
          <Icon name="search" size={14} />
          <input
            type="search"
            placeholder="Search by father or mother name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14 }}
          />
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Father</th>
              <th>Mother</th>
              <th>Siblings</th>
              <th>Enrolled</th>
              <th>Yearly discount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>No matches</td></tr>
            )}
            {data?.items.map((f) => (
              <tr key={f.familyId}>
                <td className="td-sr mono">{f.familyId}</td>
                <td className="td-name">
                  <Link to={`/families/${f.familyId}`} style={{ textDecoration: "none", color: "inherit" }}>
                    {f.fatherName ?? <span className="muted">—</span>}
                  </Link>
                </td>
                <td className="muted">{f.motherName ?? "—"}</td>
                <td className="mono">{f.siblingCount ?? "—"}</td>
                <td className="mono">
                  {f.enrolledCount}
                  {f.siblingCount && f.enrolledCount < f.siblingCount && (
                    <span className="muted"> / {f.siblingCount}</span>
                  )}
                </td>
                <td className="mono">
                  {f.yearlyDiscountTotal > 0 ? (
                    <span className="pill pill--success">₹{f.yearlyDiscountTotal.toLocaleString("en-IN")}</span>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
