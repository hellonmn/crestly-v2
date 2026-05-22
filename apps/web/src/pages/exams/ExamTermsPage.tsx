import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { Modal } from "@/components/Modal";
import { useDeleteTerm, useExamTerms, useSaveTerm, useToggleFinalize } from "./hooks";
import { getErrorMessage } from "@/lib/api";
import type { ExamTerm } from "@crestly/shared";

export function ExamTermsPage() {
  const { data: terms } = useExamTerms();
  const [editing, setEditing] = useState<ExamTerm | "new" | null>(null);
  const toggle = useToggleFinalize();
  const remove = useDeleteTerm();

  const total = (terms ?? []).reduce((s, t) => s + t.weightPercent, 0);

  return (
    <>
      <PageHead
        group="EXAMS"
        title="Terms"
        lede={`${terms?.length ?? 0} terms · total weight ${total}%`}
        actions={
          <>
            <Link to="/exams" className="btn btn--ghost btn--sm">
              <Icon name="chev-left" size={14} /> Back
            </Link>
            <button className="btn btn--primary btn--sm" onClick={() => setEditing("new")}>
              <Icon name="plus" size={14} /> Add term
            </button>
          </>
        }
      />

      {total !== 100 && total !== 0 && (
        <div className={`banner ${total < 100 ? "banner--warn" : "banner--error"}`}>
          <Icon name="alert" size={16} />
          <span>Weights sum to {total}% — expected 100%.</span>
        </div>
      )}

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Weight %</th>
              <th>Default max</th>
              <th>Finalized?</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {terms?.map((t) => (
              <tr key={t.id}>
                <td><span className="cls-pill">{t.shortCode}</span></td>
                <td className="td-name">{t.name}<div className="muted body-s mono">{t.slug}</div></td>
                <td className="mono">{t.weightPercent}</td>
                <td className="mono">{t.defaultMaxMarks}</td>
                <td>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={t.isFinalized}
                      onChange={(e) => toggle.mutate({ id: t.id, finalize: e.target.checked })}
                    />
                    {t.isFinalized ? <span className="pill pill--error">FINALIZED</span> : <span className="muted">open</span>}
                  </label>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditing(t)}>
                    <Icon name="edit" size={14} /> Edit
                  </button>
                  {!t.isFinalized && (
                    <button
                      className="btn btn--danger btn--sm"
                      style={{ marginLeft: 6 }}
                      onClick={async () => {
                        if (!confirm(`Delete term ${t.name}?`)) return;
                        try { await remove.mutateAsync(t.id); }
                        catch (e) { alert(getErrorMessage(e, "Failed")); }
                      }}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <TermModal initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function TermModal({ initial, onClose }: { initial: ExamTerm | null; onClose: () => void }) {
  const isNew = !initial;
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [shortCode, setShortCode] = useState(initial?.shortCode ?? "");
  const [weight, setWeight] = useState<string>(String(initial?.weightPercent ?? 0));
  const [defaultMax, setDefaultMax] = useState<string>(String(initial?.defaultMaxMarks ?? 100));
  const [sortOrder, setSortOrder] = useState<string>(String(initial?.sortOrder ?? 0));
  const [err, setErr] = useState<string | null>(null);
  const save = useSaveTerm(initial?.id);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await save.mutateAsync({
        slug, name, shortCode,
        weightPercent: Number(weight),
        defaultMaxMarks: Number(defaultMax),
        sortOrder: Number(sortOrder),
      });
      onClose();
    } catch (e) {
      setErr(getErrorMessage(e, "Failed to save"));
    }
  }

  return (
    <Modal open title={isNew ? "Add term" : `Edit ${initial?.name}`} onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="term-form" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="term-form" onSubmit={onSubmit} className="form-grid form-grid--2">
        <div className="field">
          <label className="field__label">Slug *</label>
          <input className="input mono" placeholder="pt1, ht, ann" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field__label">Short code *</label>
          <input className="input mono" placeholder="PT1" value={shortCode} onChange={(e) => setShortCode(e.target.value)} required />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field__label">Name *</label>
          <input className="input" placeholder="Periodic Test 1" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field"><label className="field__label">Weight %</label><input className="input mono" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} /></div>
        <div className="field"><label className="field__label">Default max marks</label><input className="input mono" type="number" value={defaultMax} onChange={(e) => setDefaultMax(e.target.value)} /></div>
        <div className="field"><label className="field__label">Sort order</label><input className="input mono" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
        {err && <div className="banner banner--error" style={{ gridColumn: "1 / -1" }}><span>{err}</span></div>}
      </form>
    </Modal>
  );
}
