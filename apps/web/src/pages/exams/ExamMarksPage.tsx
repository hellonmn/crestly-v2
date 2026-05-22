import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useExamSubjects, useExamTerms, useMarks, useSaveMark } from "./hooks";
import { getErrorMessage } from "@/lib/api";

export function ExamMarksPage() {
  const { data: terms } = useExamTerms();
  const { data: subjects } = useExamSubjects();
  const [termId, setTermId] = useState<number | "">("");
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [classSlug, setClassSlug] = useState("");
  const [section, setSection] = useState("");

  const query = (termId && subjectId && classSlug && section)
    ? { termId: Number(termId), subjectId: Number(subjectId), class: classSlug, section }
    : null;
  const { data, isLoading } = useMarks(query);
  const save = useSaveMark();

  const [drafts, setDrafts] = useState<Record<number, { marks: string; absent: boolean }>>({});

  function getDraft(srNumber: number, fallback: { marks: number | null; absent: boolean }) {
    const d = drafts[srNumber];
    if (d) return d;
    return { marks: fallback.marks != null ? String(fallback.marks) : "", absent: fallback.absent };
  }
  function setDraft(srNumber: number, patch: Partial<{ marks: string; absent: boolean }>) {
    setDrafts((prev) => ({
      ...prev,
      [srNumber]: { ...getDraft(srNumber, { marks: null, absent: false }), ...patch },
    }));
  }

  async function saveRow(srNumber: number) {
    if (!query) return;
    const d = getDraft(srNumber, { marks: null, absent: false });
    try {
      await save.mutateAsync({
        termId: query.termId,
        subjectId: query.subjectId,
        srNumber,
        marksObtained: d.absent ? null : (d.marks.trim() === "" ? null : Number(d.marks)),
        isAbsent: d.absent,
      });
    } catch (e) { alert(getErrorMessage(e, "Save failed")); }
  }

  return (
    <>
      <PageHead
        group="EXAMS"
        title="Enter Marks"
        lede={data ? `${data.termName} · ${data.subjectName} · ${data.class}-${data.section} · max ${data.maxMarks}` : "Pick term + subject + section."}
        actions={
          <Link to="/exams" className="btn btn--ghost btn--sm">
            <Icon name="chev-left" size={14} /> Back
          </Link>
        }
      />

      <div className="toolbar card">
        <select className="select" value={termId} onChange={(e) => setTermId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">— Term —</option>
          {terms?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">— Subject —</option>
          {subjects?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="input mono" placeholder="Class" value={classSlug} onChange={(e) => setClassSlug(e.target.value)} style={{ maxWidth: 120 }} />
        <input className="input mono" placeholder="Section" value={section} onChange={(e) => setSection(e.target.value)} style={{ maxWidth: 120 }} />
      </div>

      {data?.isFinalized && (
        <div className="banner banner--error">
          <Icon name="alert" size={16} />
          <span>This term is finalized. Marks are locked.</span>
        </div>
      )}

      {query && (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>SR #</th>
                <th>Student</th>
                <th>Marks (max {data?.maxMarks ?? "—"})</th>
                <th>Absent?</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>}
              {data?.rows.map((r) => {
                const d = getDraft(r.srNumber, { marks: r.marksObtained, absent: r.isAbsent });
                return (
                  <tr key={r.srNumber}>
                    <td className="td-sr mono">{r.srNumber}</td>
                    <td className="td-name">{r.studentName}</td>
                    <td>
                      <input
                        className="input input--sm mono"
                        type="number"
                        step="0.5"
                        value={d.marks}
                        disabled={d.absent || data.isFinalized}
                        onChange={(e) => setDraft(r.srNumber, { marks: e.target.value })}
                        style={{ width: 90 }}
                      />
                    </td>
                    <td>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={d.absent}
                          disabled={data.isFinalized}
                          onChange={(e) => setDraft(r.srNumber, { absent: e.target.checked })}
                        /> absent
                      </label>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn--primary btn--sm"
                        disabled={save.isPending || data.isFinalized}
                        onClick={() => saveRow(r.srNumber)}
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
