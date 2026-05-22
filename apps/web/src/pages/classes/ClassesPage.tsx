import { useState } from "react";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { Modal } from "@/components/Modal";
import {
  useClasses,
  useDeleteClass,
  useDeleteSection,
  useSaveClass,
  useSaveSection,
} from "./hooks";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { SchoolClass, Section } from "@crestly/shared";

/**
 * Stacked classes view — each class is a card with its sections inline.
 * Mirrors erp/classes/index.php.
 */
export function ClassesPage() {
  const { user } = useAuth();
  const canManage = (user?.permissions ?? []).includes("classes.manage");
  const { data: classes, isLoading } = useClasses();

  const [editingClass, setEditingClass] = useState<SchoolClass | "new" | null>(null);
  const [editingSection, setEditingSection] = useState<
    { kind: "new"; classId: number } | { kind: "edit"; section: Section } | null
  >(null);

  const totals = classes
    ? {
        classes: classes.length,
        sections: classes.reduce((s, c) => s + c.sections.length, 0),
        students: classes.reduce((s, c) => s + c.totalStudents, 0),
        overCapacity: classes
          .flatMap((c) => c.sections)
          .filter((s) => s.capacity != null && s.studentCount > s.capacity).length,
      }
    : { classes: 0, sections: 0, students: 0, overCapacity: 0 };

  return (
    <>
      <PageHead
        group="RECORDS"
        title="Classes & Sections"
        lede="Master list of classes and their sections. Click a section to edit capacity or assign a class-teacher."
        actions={
          canManage && (
            <button className="btn btn--primary btn--sm" onClick={() => setEditingClass("new")}>
              <Icon name="plus" size={14} /> Add class
            </button>
          )
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mustard" icon="classes" label="CLASSES" value={String(totals.classes)} delta="" />
        <StatTile tint="wheat" icon="classes" label="SECTIONS" value={String(totals.sections)} delta="" />
        <StatTile tint="mint" icon="students" label="ACTIVE STUDENTS" value={totals.students.toLocaleString("en-IN")} delta="" />
        <StatTile tint="rose" icon="alert" label="OVER CAPACITY" value={String(totals.overCapacity)} delta={totals.overCapacity > 0 ? "needs attention" : "all ok"} />
      </div>

      {isLoading && <p className="muted">Loading…</p>}

      {classes?.map((c) => (
        <ClassCard
          key={c.id}
          cls={c}
          canManage={canManage}
          onEditClass={() => setEditingClass(c)}
          onAddSection={() => setEditingSection({ kind: "new", classId: c.id })}
          onEditSection={(s) => setEditingSection({ kind: "edit", section: s })}
        />
      ))}

      {editingClass && (
        <ClassEditModal
          initial={editingClass === "new" ? null : editingClass}
          onClose={() => setEditingClass(null)}
        />
      )}
      {editingSection && (
        <SectionEditModal state={editingSection} onClose={() => setEditingSection(null)} />
      )}
    </>
  );
}

function ClassCard({
  cls,
  canManage,
  onEditClass,
  onAddSection,
  onEditSection,
}: {
  cls: SchoolClass;
  canManage: boolean;
  onEditClass: () => void;
  onAddSection: () => void;
  onEditSection: (s: Section) => void;
}) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <span className="cls-pill">{cls.slug}</span>
        <div className="display-s">{cls.name}</div>
        {cls.isSystem && <span className="pill pill--wheat">SYSTEM</span>}
        <span className="muted" style={{ fontSize: 12 }}>
          · {cls.sections.length} section{cls.sections.length === 1 ? "" : "s"} · {cls.totalStudents} student{cls.totalStudents === 1 ? "" : "s"}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {canManage && (
            <button className="btn btn--ghost btn--sm" onClick={onEditClass}>
              <Icon name="edit" size={14} /> Rename
            </button>
          )}
          {canManage && (
            <button className="btn btn--primary btn--sm" onClick={onAddSection}>
              <Icon name="plus" size={14} /> Add section
            </button>
          )}
        </div>
      </div>

      {cls.sections.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>No sections yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Students</th>
              <th>Capacity</th>
              <th>Class teacher</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cls.sections.map((s) => {
              const over = s.capacity != null && s.studentCount > s.capacity;
              return (
                <tr key={s.id}>
                  <td className="mono"><span className="cls-pill">{cls.slug}-{s.code}</span></td>
                  <td className="mono">{s.studentCount}</td>
                  <td className="mono">
                    {s.capacity ?? <span className="muted">—</span>}
                    {over && <span className="pill pill--error" style={{ marginLeft: 8 }}>OVER</span>}
                  </td>
                  <td>{s.teacherName ?? <span className="muted">—</span>}</td>
                  <td style={{ textAlign: "right" }}>
                    {canManage && (
                      <button className="btn btn--ghost btn--sm" onClick={() => onEditSection(s)}>
                        <Icon name="edit" size={14} /> Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ClassEditModal({ initial, onClose }: { initial: SchoolClass | null; onClose: () => void }) {
  const isNew = !initial;
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [sortOrder, setSortOrder] = useState<number>(initial?.sortOrder ?? 0);
  const [error, setError] = useState<string | null>(null);
  const save = useSaveClass(initial?.id);
  const remove = useDeleteClass();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({ slug, name, sortOrder });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save"));
    }
  }

  async function onDelete() {
    if (!initial) return;
    if (!confirm(`Delete class ${initial.name}? This cannot be undone.`)) return;
    try {
      await remove.mutateAsync(initial.id);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete"));
    }
  }

  return (
    <Modal
      open
      title={isNew ? "Add a class" : `Rename ${initial?.name}`}
      onClose={onClose}
      actions={
        <>
          {!isNew && !initial?.isSystem && (
            <button type="button" className="btn btn--danger" onClick={onDelete} style={{ marginRight: "auto" }}>
              Delete
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="class-edit" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="class-edit" onSubmit={onSubmit} className="form-grid form-grid--2">
        <div className="field">
          <label className="field__label">Slug *</label>
          <input className="input mono" placeholder="10, nur, 11-c…" value={slug} onChange={(e) => setSlug(e.target.value)} disabled={initial?.isSystem} required />
        </div>
        <div className="field">
          <label className="field__label">Name *</label>
          <input className="input" placeholder="Class 10" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field__label">Sort order</label>
          <input className="input" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value || 0))} />
        </div>
        {error && (
          <div className="banner banner--error" style={{ gridColumn: "1 / -1" }}>
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

function SectionEditModal({
  state,
  onClose,
}: {
  state: { kind: "new"; classId: number } | { kind: "edit"; section: Section };
  onClose: () => void;
}) {
  const isNew = state.kind === "new";
  const initial = state.kind === "edit" ? state.section : null;
  const classId = state.kind === "new" ? state.classId : state.section.classId;

  const [code, setCode] = useState(initial?.code ?? "");
  const [capacity, setCapacity] = useState<string>(initial?.capacity?.toString() ?? "");
  const [teacherUserId, setTeacherUserId] = useState<string>(initial?.teacherUserId?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = useSaveSection(initial?.id);
  const remove = useDeleteSection();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({
        classId,
        code,
        capacity: capacity.trim() === "" ? null : Number(capacity),
        teacherUserId: teacherUserId.trim() === "" ? null : Number(teacherUserId),
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save"));
    }
  }

  async function onDelete() {
    if (!initial) return;
    if (!confirm(`Delete section ${initial.code}?`)) return;
    try {
      await remove.mutateAsync(initial.id);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete"));
    }
  }

  return (
    <Modal
      open
      title={isNew ? "Add a section" : `Edit section ${initial?.code}`}
      onClose={onClose}
      actions={
        <>
          {!isNew && (
            <button type="button" className="btn btn--danger" onClick={onDelete} style={{ marginRight: "auto" }}>
              Delete
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="section-edit" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="section-edit" onSubmit={onSubmit} className="form-grid form-grid--2">
        <div className="field">
          <label className="field__label">Section code *</label>
          <input className="input mono" placeholder="A, B, C…" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field__label">Capacity</label>
          <input className="input" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field__label">Class teacher (user id)</label>
          <input
            className="input"
            type="number"
            placeholder="Look up the user id under /team and paste it here"
            value={teacherUserId}
            onChange={(e) => setTeacherUserId(e.target.value)}
          />
          <span className="field__hint">A teacher-picker dropdown will come in Batch B when timetable lands.</span>
        </div>
        {error && (
          <div className="banner banner--error" style={{ gridColumn: "1 / -1" }}>
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
