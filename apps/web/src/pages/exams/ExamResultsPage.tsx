import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { useExamTerms, useResults } from "./hooks";

export function ExamResultsPage() {
  const { data: terms } = useExamTerms();
  const [termId, setTermId] = useState<number | "">("");
  const [classSlug, setClassSlug] = useState("");
  const [section, setSection] = useState("");

  const query = classSlug && section
    ? { termId: termId ? Number(termId) : undefined, class: classSlug, section }
    : null;
  const { data, isLoading } = useResults(query);

  return (
    <>
      <PageHead
        group="EXAMS"
        title="Class Results"
        lede={data ? `${data.scope === "term" ? data.termName : "Full session"} · ${data.class}-${data.section}` : "Pick a section."}
        actions={
          <Link to="/exams" className="btn btn--ghost btn--sm">
            <Icon name="chev-left" size={14} /> Back
          </Link>
        }
      />

      <div className="toolbar card">
        <select className="select" value={termId} onChange={(e) => setTermId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">Full session</option>
          {terms?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input className="input mono" placeholder="Class" value={classSlug} onChange={(e) => setClassSlug(e.target.value)} style={{ maxWidth: 120 }} />
        <input className="input mono" placeholder="Section" value={section} onChange={(e) => setSection(e.target.value)} style={{ maxWidth: 120 }} />
      </div>

      {data && (
        <>
          <div className="grid grid--cols-4 grid--gap-sm">
            <StatTile tint="mint" icon="check" label="PASSED" value={String(data.passed)} delta="students" />
            <StatTile tint="rose" icon="x" label="FAILED" value={String(data.failed)} delta="students" />
            <StatTile tint="mustard" icon="features" label="CLASS AVG" value={`${data.classAverage}%`} delta="" />
            <StatTile tint="sky" icon="exams" label="TOPPER" value={data.topper ? `${data.topper.percentage}%` : "—"} delta={data.topper?.studentName ?? ""} />
          </div>

          {Object.keys(data.gradeDistribution).length > 0 && (
            <div className="card">
              <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Grade distribution</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(data.gradeDistribution).sort().map(([g, n]) => (
                  <span key={g} className="pill pill--wheat">{g}: {n}</span>
                ))}
              </div>
            </div>
          )}

          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>SR</th>
                  <th>Student</th>
                  <th>Obtained / Max</th>
                  <th>%</th>
                  <th>Grade</th>
                  <th>Pass/Fail</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>}
                {data.rows.map((r) => (
                  <tr key={r.srNumber}>
                    <td><span className={`pill ${rankPill(r.rank)}`}>#{r.rank}</span></td>
                    <td className="td-sr mono">{r.srNumber}</td>
                    <td className="td-name">{r.studentName}</td>
                    <td className="mono">{r.totalObtained} / {r.totalMax}</td>
                    <td className="mono">{r.percentage}%</td>
                    <td><span className="cls-pill">{r.grade}</span></td>
                    <td>
                      <span className={`pill ${r.passFail === "PASS" ? "pill--success" : "pill--error"}`}>
                        <span className="pill__dot" />
                        {r.passFail}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function rankPill(rank: number): string {
  if (rank === 1) return "pill--mustard";
  if (rank === 2) return "pill--neutral";
  if (rank === 3) return "pill--peach";
  return "pill--neutral";
}
