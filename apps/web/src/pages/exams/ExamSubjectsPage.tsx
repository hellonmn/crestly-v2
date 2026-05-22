import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { Modal } from "@/components/Modal";
import { useClasses } from "@/pages/classes/hooks";
import { useDeleteSubject, useExamSubjects, useSaveSubject, useToggleSubjectClass } from "./hooks";
import { getErrorMessage } from "@/lib/api";
import type { ExamSubject } from "@crestly/shared";

export function ExamSubjectsPage() {
  const { data: subjects } = useExamSubjects();
  const { data: classes } = useClasses();
  const [editing, setEditing] = useState<ExamSubject | "new" | null>(null);
  const toggle = useToggleSubjectClass();

  return (
    <>
      <PageHead
        group="EXAMS"
        title="Subjects"
        lede="Subject catalogue + per-class assignment matrix."
        actions={
          <>
            <Link to="/exams" className="btn btn--ghost btn--sm">
              <Icon name="chev-left" size={14} /> Back
            </Link>
            <button className="btn btn--primary btn--sm" onClick={() => setEditing("new")}>
              <Icon name="plus" size={14} /> Add subject
            </button>
          </>
        }
      />

      <div className="table-card" style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ minWidth: 720 }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, background: "var(--cream-soft)" }}>Subject</th>
              <th>Code</th>
              <th>Lang?</th>
              {classes?.map((c) => <th key={c.id}>{c.slug}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {subjects?.map((s) => (
              <tr key={s.id}>
                <td className="td-name" style={{ position: "sticky", left: 0, background: "var(--white)" }}>
                  {s.name}
                </td>
                <td className="mono"><span className="cls-pill">{s.shortCode}</span></td>
                <td>{s.isLanguage ? <span className="pill pill--info">LANG</span> : <span className="muted">—</span>}</td>
                {classes?.map((c) => (
                  <td key={c.id} style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={s.classes.includes(c.slug)}
                      onChange={(e) => toggle.mutate({ classSlug: c.slug, subjectId: s.id, enabled: e.target.checked })}
                    />
                  </td>
                ))}
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditing(s)}>
                    <Icon name="edit" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <SubjectModal initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function SubjectModal({ initial, onClose }: { initial: ExamSubject | null; onClose: () => void }) {
  const isNew = !initial;
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [shortCode, setShortCode] = useState(initial?.shortCode ?? "");
  const [isLanguage, setIsLanguage] = useState(initial?.isLanguage ?? false);
  const [sortOrder, setSortOrder] = useState<string>(String(initial?.sortOrder ?? 0));
  const [err, setErr] = useState<string | null>(null);
  const save = useSaveSubject(initial?.id);
  const remove = useDeleteSubject();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await save.mutateAsync({ slug, name, shortCode, isLanguage, sortOrder: Number(sortOrder) });
      onClose();
    } catch (e) { setErr(getErrorMessage(e, "Failed to save")); }
  }

  async function onDelete() {
    if (!initial) return;
    if (!confirm(`Delete subject ${initial.name}?`)) return;
    try { await remove.mutateAsync(initial.id); onClose(); }
    catch (e) { setErr(getErrorMessage(e, "Failed")); }
  }

  return (
    <Modal open title={isNew ? "Add subject" : `Edit ${initial?.name}`} onClose={onClose}
      actions={
        <>
          {!isNew && <button type="button" className="btn btn--danger" onClick={onDelete} style={{ marginRight: "auto" }}>Delete</button>}
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="subj-form" className="btn btn--primary" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</button>
        </>
      }
    >
      <form id="subj-form" onSubmit={onSubmit} className="form-grid form-grid--2">
        <div className="field"><label className="field__label">Slug *</label><input className="input mono" value={slug} onChange={(e) => setSlug(e.target.value)} required /></div>
        <div className="field"><label className="field__label">Short code *</label><input className="input mono" value={shortCode} onChange={(e) => setShortCode(e.target.value)} required /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label className="field__label">Name *</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="field">
          <label className="field__label">Type</label>
          <label className="check"><input type="checkbox" checked={isLanguage} onChange={(e) => setIsLanguage(e.target.checked)} /> Language subject</label>
        </div>
        <div className="field"><label className="field__label">Sort order</label><input className="input mono" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
        {err && <div className="banner banner--error" style={{ gridColumn: "1 / -1" }}><span>{err}</span></div>}
      </form>
    </Modal>
  );
}
