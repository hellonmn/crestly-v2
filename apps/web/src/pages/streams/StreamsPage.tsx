import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useStreamRoster, useStreams } from "./hooks";

export function StreamsPage() {
  const [params, setParams] = useSearchParams();
  const activeStream = params.get("stream") ?? null;
  const { data: streams, isLoading } = useStreams();
  const { data: roster, isLoading: rosterLoading } = useStreamRoster(activeStream ?? undefined);

  return (
    <>
      <PageHead
        group="RECORDS"
        title="Streams"
        lede="Reference data for classes 11 and 12 — PCM / PCB / Commerce subject map + per-stream rosters."
      />

      <div className="grid grid--cols-3 grid--gap-sm">
        {isLoading && <p className="muted">Loading…</p>}
        {streams?.map((s) => (
          <div key={s.stream} className="card">
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div className="display-s">{s.stream}</div>
              <span className="pill pill--wheat mono">{s.sectionsCount} sec · {s.studentCount} stu</span>
            </div>
            <p className="muted body-s" style={{ margin: "6px 0 12px" }}>
              {s.subjects.length} subject{s.subjects.length === 1 ? "" : "s"}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {s.subjects.map((sub) => (
                <span key={sub.id} className={`pill ${sub.isOptional ? "pill--neutral" : "pill--mint"}`}>
                  {sub.subjectName}
                </span>
              ))}
            </div>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setParams({ stream: s.stream })}
            >
              <Icon name="users" size={14} /> View roster
            </button>
          </div>
        ))}
      </div>

      {activeStream && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
            <div className="display-s">{activeStream} roster</div>
            <button className="btn btn--ghost btn--sm" onClick={() => setParams({})}>
              <Icon name="x" size={14} /> Close
            </button>
          </div>

          {rosterLoading && <p className="muted">Loading roster…</p>}
          {roster && roster.length === 0 && <p className="muted">No active students in this stream.</p>}
          {roster && roster.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>SR #</th>
                  <th>Name</th>
                  <th>Class</th>
                  <th>Father</th>
                  <th>Gender</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r) => (
                  <tr key={r.srNumber}>
                    <td className="td-sr mono">{r.srNumber}</td>
                    <td className="td-name">
                      <Link to={`/students/${r.srNumber}`} style={{ textDecoration: "none", color: "inherit" }}>
                        {r.studentName}
                      </Link>
                    </td>
                    <td><span className="cls-pill">{r.class}-{r.section}</span></td>
                    <td className="muted">{r.fatherName ?? "—"}</td>
                    <td className="muted">{r.gender ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
