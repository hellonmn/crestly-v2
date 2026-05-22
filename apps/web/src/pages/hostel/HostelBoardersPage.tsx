import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useHostelBoarders } from "./hooks";
import type { HostelBlock } from "@crestly/shared";

export function HostelBoardersPage() {
  const [q, setQ] = useState("");
  const [block, setBlock] = useState<HostelBlock | "">("");
  const [classSlug, setClassSlug] = useState("");
  const { data, isLoading } = useHostelBoarders({
    q: q || undefined,
    block: block || undefined,
    class: classSlug || undefined,
  });

  return (
    <>
      <PageHead
        group="HOSTEL"
        title="Boarders"
        lede={data ? `${data.length} active boarders` : "Loading…"}
        actions={
          <Link to="/hostel" className="btn btn--ghost btn--sm">
            <Icon name="chev-left" size={14} /> Back
          </Link>
        }
      />

      <div className="toolbar card">
        <div className="search">
          <Icon name="search" size={14} />
          <input type="search" placeholder="Search by name, father, guardian…" value={q} onChange={(e) => setQ(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14 }} />
        </div>
        <select className="select" value={block} onChange={(e) => setBlock(e.target.value as HostelBlock | "")}>
          <option value="">All blocks</option>
          <option value="Boys">Boys</option>
          <option value="Girls">Girls</option>
        </select>
        <input className="input mono" placeholder="Class" value={classSlug} onChange={(e) => setClassSlug(e.target.value)} style={{ maxWidth: 120 }} />
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>SR #</th>
              <th>Student</th>
              <th>Class</th>
              <th>Room</th>
              <th>Block</th>
              <th>Guardian</th>
              <th>Home</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>}
            {!isLoading && data?.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>No matches</td></tr>
            )}
            {data?.map((b) => (
              <tr key={b.srNumber}>
                <td className="td-sr mono">{b.srNumber}</td>
                <td className="td-name">
                  <Link to={`/students/${b.srNumber}`} style={{ textDecoration: "none", color: "inherit" }}>
                    {b.studentName}
                  </Link>
                  <div className="muted body-s">{b.fatherName ?? "—"}</div>
                </td>
                <td><span className="cls-pill">{b.class}-{b.section}</span></td>
                <td className="mono">{b.roomNo ?? "—"}<div className="muted body-s">{b.roomType ?? ""}</div></td>
                <td>
                  {b.block && (
                    <span className={`pill ${b.block === "Boys" ? "pill--info" : "pill--rose" as never}`}>
                      {b.block}
                    </span>
                  )}
                </td>
                <td className="muted">{b.localGuardianName ?? "—"}<div className="mono body-s">{b.localGuardianContact ?? ""}</div></td>
                <td className="muted">{b.homeCity ?? "—"}{b.homeState ? `, ${b.homeState}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
