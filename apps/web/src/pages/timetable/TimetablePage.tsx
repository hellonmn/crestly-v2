import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { Modal } from "@/components/Modal";
import {
  useAutoFillClass,
  useDeleteCell, useDeleteMasterCellBulk,
  useSaveCell, useSaveMasterCellBulk,
  useTimetable, useTimetableMaster,
} from "./hooks";
import { useClasses } from "@/pages/classes/hooks";
import { usePickableTeam } from "@/pages/team/hooks";
import { useExamSubjects } from "@/pages/exams/hooks";
import { useAuth } from "@/lib/auth-store";
import { getErrorMessage } from "@/lib/api";
import type {
  TimetableCell, TimetableMasterCell,
  TimetablePeriod,
} from "@crestly/shared";

/* ============================================================
   Timetable grid — section view is click-to-edit (when the user
   has `timetable.manage`); teacher view is always read-only
   because the same physical period+section drives both, so a
   teacher's row is composed of cells across many sections.
   ============================================================ */

const DAYS = [
  { idx: 1, short: "Mon", long: "Monday" },
  { idx: 2, short: "Tue", long: "Tuesday" },
  { idx: 3, short: "Wed", long: "Wednesday" },
  { idx: 4, short: "Thu", long: "Thursday" },
  { idx: 5, short: "Fri", long: "Friday" },
  { idx: 6, short: "Sat", long: "Saturday" },
] as const;

type EditTarget = {
  day: number;
  period: TimetablePeriod;
  classSlug: string;
  sectionCode: string;
  cell: TimetableCell | null;
};

/**
 * Master-cell edit target. Always carries the full list of sections in
 * the parent class so the editor can render the section-picker checkboxes.
 * When opened from the per-section grid, defaultSelected = [that one
 * section]; when opened from the class-collapsed grid, defaultSelected =
 * every section of the class.
 */
type MasterEditTarget = {
  period: TimetablePeriod;
  classSlug: string;
  className: string;
  sections: Array<{
    sectionCode: string;
    cell: TimetableMasterCell | null;
  }>;
  defaultSelectedCodes: string[];
  /** When true, the editor pre-fills from the consensus cell across
   *  defaultSelectedCodes; when false, the editor starts blank. */
  prefillFromSelected: boolean;
};

type Scope = "section" | "teacher" | "master";

export function TimetablePage() {
  const { user } = useAuth();
  const canManage = (user?.permissions ?? []).includes("timetable.manage");

  const [scope, setScope]   = useState<Scope>("section");
  const [classSlug, setClassSlug] = useState("");
  const [section, setSection]     = useState("");
  const [teacherUserId, setTeacherUserId] = useState<string>("");
  const [editing, setEditing] = useState<EditTarget | null>(null);
  /** Master view: collapse section columns into a single per-class column. */
  const [masterCollapse, setMasterCollapse] = useState<boolean>(false);
  const [masterEditing, setMasterEditing] = useState<MasterEditTarget | null>(null);
  const [autoFillOpen, setAutoFillOpen]   = useState<boolean>(false);
  const [flash, setFlash]     = useState<string | null>(null);

  const { data: classes } = useClasses();
  const { data: team }    = usePickableTeam();

  const sectionOptions = useMemo(() => {
    if (!classSlug || !classes) return [] as string[];
    const cls = classes.find((c) => c.slug === classSlug);
    return cls?.sections.map((s) => s.code) ?? [];
  }, [classSlug, classes]);

  const teacherOptions = useMemo(() => {
    return (team?.items ?? []).filter((u) =>
      (u.designation ?? "").toLowerCase().includes("teacher") ||
      u.roleSlug === "teacher" ||
      !!u.classTeacherOf,
    );
  }, [team]);

  const query = scope === "section"
    ? (classSlug && section ? { class: classSlug, section } : null)
    : (teacherUserId ? { teacherUserId: Number(teacherUserId) } : null);

  const { data, isLoading } = useTimetable(query);

  const cellLookup = new Map<string, TimetableCell>();
  for (const c of data?.cells ?? []) {
    cellLookup.set(`${c.dayOfWeek}|${c.periodId}`, c);
  }

  const editable = scope === "section" && canManage && !!classSlug && !!section;

  function openCell(day: number, period: TimetablePeriod) {
    if (!editable || period.isBreak) return;
    setEditing({
      day,
      period,
      classSlug,
      sectionCode: section,
      cell: cellLookup.get(`${day}|${period.id}`) ?? null,
    });
  }

  function notify(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  }

  // Coverage % for section view — what fraction of teaching slots have a cell.
  const coverage = useMemo(() => {
    if (!data || data.scope !== "section") return null;
    const teaching = data.periods.filter((p) => !p.isBreak).length;
    const totalSlots = teaching * DAYS.length;
    if (totalSlots === 0) return null;
    const filled = data.cells.filter((c) => {
      const p = data.periods.find((pp) => pp.id === c.periodId);
      return p && !p.isBreak;
    }).length;
    return { totalSlots, filled, pct: Math.round((filled / totalSlots) * 100) };
  }, [data]);

  return (
    <>
      <PageHead
        group="RECORDS"
        meta="TIMETABLE"
        title="Timetable"
        lede={
          data
            ? `${data.scope === "section" ? "Section" : "Teacher"}: ${data.scopeLabel} · Session ${data.sessionCode}`
            : "Pick a section or teacher to load the grid. Click a cell to assign a subject + teacher."
        }
        actions={
          <>
            <Link to="/timetable/periods" className="btn btn--ghost btn--sm">
              <Icon name="settings" size={14} /> Periods
            </Link>
            <Link to="/timetable/workload" className="btn btn--ghost btn--sm">
              <Icon name="users" size={14} /> Workload
            </Link>
          </>
        }
      />

      {flash && (
        <div className="banner banner--success">
          <Icon name="check" size={16} /><span>{flash}</span>
        </div>
      )}

      <div className="toolbar card tt-toolbar">
        <div className="seg-btn-group">
          <button
            type="button"
            className={`btn btn--sm ${scope === "section" ? "btn--ink" : "btn--ghost"}`}
            onClick={() => setScope("section")}
          >
            By section
          </button>
          <button
            type="button"
            className={`btn btn--sm ${scope === "teacher" ? "btn--ink" : "btn--ghost"}`}
            onClick={() => setScope("teacher")}
          >
            By teacher
          </button>
          <button
            type="button"
            className={`btn btn--sm ${scope === "master" ? "btn--ink" : "btn--ghost"}`}
            onClick={() => setScope("master")}
            title="Single grid for schools whose timetable doesn't change Mon–Sat"
          >
            Master
          </button>
        </div>

        {scope === "section" && (
          <>
            <select
              className="select"
              value={classSlug}
              onChange={(e) => { setClassSlug(e.target.value); setSection(""); }}
              style={{ maxWidth: 160 }}
              aria-label="Class"
            >
              <option value="">— Class —</option>
              {(classes ?? []).map((c) => (
                <option key={c.id} value={c.slug}>{c.slug}</option>
              ))}
            </select>
            <select
              className="select"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              disabled={!classSlug || sectionOptions.length === 0}
              style={{ maxWidth: 140 }}
              aria-label="Section"
            >
              <option value="">{classSlug ? "— Section —" : "Pick class first"}</option>
              {sectionOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </>
        )}
        {scope === "teacher" && (
          <select
            className="select"
            value={teacherUserId}
            onChange={(e) => setTeacherUserId(e.target.value)}
            style={{ maxWidth: 280 }}
            aria-label="Teacher"
          >
            <option value="">— Teacher —</option>
            {teacherOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.department && ` · ${u.department}`}
              </option>
            ))}
          </select>
        )}
        {scope === "master" && (
          <>
            <div className="seg-btn-group" title="Show one column per section, or collapse sections into class columns">
              <button
                type="button"
                className={`btn btn--sm ${!masterCollapse ? "btn--ink" : "btn--ghost"}`}
                onClick={() => setMasterCollapse(false)}
              >
                Sections
              </button>
              <button
                type="button"
                className={`btn btn--sm ${masterCollapse ? "btn--ink" : "btn--ghost"}`}
                onClick={() => setMasterCollapse(true)}
              >
                Classes
              </button>
            </div>
            {canManage && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setAutoFillOpen(true)}
                title="Distribute a class's subjects across periods automatically"
              >
                <Icon name="settings" size={14} /> Auto-fill
              </button>
            )}
            <span className="muted body-s" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="info" size={14} />
              Saves apply to <b>every day Mon–Sat</b>.
            </span>
          </>
        )}

        {scope !== "master" && coverage && (
          <div className="tt-coverage">
            <span className="label">COVERAGE</span>
            <b>{coverage.filled}/{coverage.totalSlots}</b>
            <span className="muted body-s">({coverage.pct}%)</span>
          </div>
        )}
      </div>

      {scope !== "master" && !query && !isLoading && (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center" }}>
          <div className="label" style={{ marginBottom: 6 }}>NOTHING LOADED</div>
          <div className="muted body-s">
            Pick a class + section{canManage ? " to build the timetable, " : " "}or switch to “By teacher” to see one teacher's week.
          </div>
        </div>
      )}

      {scope !== "master" && isLoading && <p className="muted">Loading…</p>}

      {scope === "master" && (
        <MasterGridSection
          canManage={canManage}
          collapseClass={masterCollapse}
          onOpenCell={(t) => setMasterEditing(t)}
        />
      )}

      {scope !== "master" && data && (
        <div className="tt-card card">
          {editable && (
            <div className="tt-hint">
              <Icon name="edit" size={12} />
              <span>Click any cell to assign a subject + teacher. Breaks are locked.</span>
            </div>
          )}

          <div className="tt-scroll">
            <table className="tt-grid">
              <thead>
                <tr>
                  <th className="tt-grid__period-head">Period</th>
                  {DAYS.map((d) => (
                    <th key={d.idx} title={d.long}>{d.short}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.periods.map((p) => (
                  <tr key={p.id} className={p.isBreak ? "tt-row--break" : ""}>
                    <th className="tt-grid__period">
                      <div className="tt-grid__period-name">{p.name}</div>
                      <div className="muted mono tt-grid__period-time">
                        {p.startTime.slice(0, 5)}–{p.endTime.slice(0, 5)}
                      </div>
                    </th>
                    {DAYS.map((d) => {
                      const cell = cellLookup.get(`${d.idx}|${p.id}`);
                      if (p.isBreak) {
                        return (
                          <td key={d.idx} className="tt-grid__cell tt-grid__cell--break">
                            <span>break</span>
                          </td>
                        );
                      }
                      const isEditable = editable;
                      return (
                        <td
                          key={d.idx}
                          className={
                            "tt-grid__cell " +
                            (cell ? "tt-grid__cell--filled " : "tt-grid__cell--empty ") +
                            (isEditable ? "tt-grid__cell--editable " : "")
                          }
                          onClick={isEditable ? () => openCell(d.idx, p) : undefined}
                          role={isEditable ? "button" : undefined}
                          tabIndex={isEditable ? 0 : undefined}
                          onKeyDown={isEditable ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openCell(d.idx, p);
                            }
                          } : undefined}
                        >
                          {cell ? (
                            <CellContent cell={cell} showSection={scope === "teacher"} />
                          ) : isEditable ? (
                            <div className="tt-cell-add">
                              <Icon name="plus" size={12} /> assign
                            </div>
                          ) : (
                            <span className="muted">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <CellEditorModal
          target={editing}
          onClose={() => setEditing(null)}
          onSaved={(action) =>
            notify(action === "deleted" ? "Cell cleared." : "Cell saved.")
          }
        />
      )}

      {masterEditing && (
        <MasterCellEditorModal
          target={masterEditing}
          onClose={() => setMasterEditing(null)}
          onSaved={(action, sections, days) =>
            notify(
              action === "deleted"
                ? `Cleared from ${sections} section${sections === 1 ? "" : "s"} × ${days} day${days === 1 ? "" : "s"}.`
                : `Saved to ${sections} section${sections === 1 ? "" : "s"} × ${days} day${days === 1 ? "" : "s"}.`,
            )
          }
        />
      )}

      {autoFillOpen && (
        <AutoFillModal
          onClose={() => setAutoFillOpen(false)}
          onDone={(r) =>
            notify(
              `Auto-fill done — ${r.cellsWritten} cell${r.cellsWritten === 1 ? "" : "s"} written` +
              (r.cellsSkipped > 0 ? `, ${r.cellsSkipped} skipped.` : "."),
            )
          }
        />
      )}

      <style>{TT_CSS}</style>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Cell content (read-only)                                            */
/* ------------------------------------------------------------------ */

function CellContent({ cell, showSection }: { cell: TimetableCell; showSection: boolean }) {
  return (
    <div className="tt-cell">
      {showSection && (
        <div className="tt-cell__section">
          {cell.classSlug}-{cell.sectionCode}
        </div>
      )}
      <div className="tt-cell__subject">{cell.subjectName ?? "—"}</div>
      <div className="tt-cell__teacher muted">{cell.teacherName ?? "—"}</div>
      {(cell.subjectName2 || cell.teacherName2) && (
        <div className="tt-cell__second muted">
          + {cell.subjectName2 ?? "—"}
          {cell.teacherName2 && ` · ${cell.teacherName2}`}
        </div>
      )}
      {cell.room && (
        <div className="tt-cell__room mono muted">
          <Icon name="map-pin" size={10} /> {cell.room}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cell editor modal                                                   */
/* ------------------------------------------------------------------ */

function CellEditorModal({
  target, onClose, onSaved,
}: {
  target: EditTarget;
  onClose: () => void;
  onSaved: (action: "saved" | "deleted") => void;
}) {
  const { cell, day, period, classSlug, sectionCode } = target;

  const { data: allSubjects } = useExamSubjects();
  const { data: team }        = usePickableTeam();
  const save                  = useSaveCell();
  const remove                = useDeleteCell();

  // Subjects eligible for this class (i.e. mapped in exam subjects). Fall back
  // to the full list if no mapping exists yet so the form is never empty.
  const eligibleSubjects = useMemo(() => {
    const list = allSubjects ?? [];
    const mapped = list.filter((s) => s.classes.includes(classSlug));
    return mapped.length > 0 ? mapped : list;
  }, [allSubjects, classSlug]);

  const teachers = useMemo(() => {
    return (team?.items ?? [])
      .filter((u) =>
        (u.designation ?? "").toLowerCase().includes("teacher") ||
        u.roleSlug === "teacher" ||
        !!u.classTeacherOf,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [team]);

  const [subjectId, setSubjectId]       = useState<string>(cell?.subjectId       ? String(cell.subjectId)       : "");
  const [teacherUserId, setTeacherUid]  = useState<string>(cell?.teacherUserId   ? String(cell.teacherUserId)   : "");
  const [subjectId2, setSubjectId2]     = useState<string>(cell?.subjectId2      ? String(cell.subjectId2)      : "");
  const [teacherUserId2, setTeacherUid2] = useState<string>(cell?.teacherUserId2 ? String(cell.teacherUserId2)  : "");
  const [room, setRoom]                 = useState<string>(cell?.room ?? "");
  const [notes, setNotes]               = useState<string>(cell?.notes ?? "");
  const [showSecond, setShowSecond]     = useState<boolean>(!!(cell?.subjectId2 || cell?.teacherUserId2));
  const [err, setErr]                   = useState<string | null>(null);

  const dayLong = DAYS.find((d) => d.idx === day)?.long ?? "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await save.mutateAsync({
        classSlug,
        sectionCode,
        dayOfWeek: day,
        periodId: period.id,
        subjectId:      subjectId      ? Number(subjectId)      : null,
        teacherUserId:  teacherUserId  ? Number(teacherUserId)  : null,
        subjectId2:     showSecond && subjectId2     ? Number(subjectId2)     : null,
        teacherUserId2: showSecond && teacherUserId2 ? Number(teacherUserId2) : null,
        room:  room.trim()  || null,
        notes: notes.trim() || null,
      });
      onSaved("saved");
      onClose();
    } catch (e) {
      setErr(getErrorMessage(e, "Failed to save cell"));
    }
  }

  async function onClear() {
    if (!cell) return;
    if (!confirm(`Clear ${dayLong} · ${period.name}?`)) return;
    try {
      await remove.mutateAsync(cell.id);
      onSaved("deleted");
      onClose();
    } catch (e) {
      setErr(getErrorMessage(e, "Failed to clear"));
    }
  }

  return (
    <Modal
      open
      title={`${classSlug}-${sectionCode} · ${dayLong} · ${period.name}`}
      onClose={onClose}
      actions={
        <>
          {cell && (
            <button type="button" className="btn btn--danger" onClick={onClear} style={{ marginRight: "auto" }}>
              Clear cell
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="cell-form" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="cell-form" onSubmit={onSubmit} className="form-grid form-grid--2">
        <div className="field">
          <label className="field__label" htmlFor="c-subject">Subject</label>
          <select
            id="c-subject"
            className="select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">— No subject —</option>
            {eligibleSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.shortCode})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="c-teacher">Teacher</label>
          <select
            id="c-teacher"
            className="select"
            value={teacherUserId}
            onChange={(e) => setTeacherUid(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {teachers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.department ? ` · ${u.department}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="c-room">Room</label>
          <input
            id="c-room"
            className="input mono"
            placeholder="e.g. R-204"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            maxLength={40}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="c-notes">Notes</label>
          <input
            id="c-notes"
            className="input"
            placeholder="optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="field span-2">
          <label className="check" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={showSecond}
              onChange={(e) => setShowSecond(e.target.checked)}
            />
            <span>Add a <b>parallel slot</b> (e.g. split class: language A vs language B)</span>
          </label>
        </div>

        {showSecond && (
          <>
            <div className="field">
              <label className="field__label" htmlFor="c-subject2">Subject (2nd)</label>
              <select
                id="c-subject2"
                className="select"
                value={subjectId2}
                onChange={(e) => setSubjectId2(e.target.value)}
              >
                <option value="">— No subject —</option>
                {eligibleSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.shortCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="c-teacher2">Teacher (2nd)</label>
              <select
                id="c-teacher2"
                className="select"
                value={teacherUserId2}
                onChange={(e) => setTeacherUid2(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {teachers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.department ? ` · ${u.department}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {err && (
          <div className="banner banner--error" style={{ gridColumn: "1 / -1" }}>
            <Icon name="alert" size={14} /><span>{err}</span>
          </div>
        )}

        <div className="muted body-s" style={{ gridColumn: "1 / -1" }}>
          {period.startTime.slice(0, 5)}–{period.endTime.slice(0, 5)} · Period {period.periodNo}
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Master grid (periods × all sections OR periods × classes)           */
/* ------------------------------------------------------------------ */

function MasterGridSection({
  canManage, collapseClass, onOpenCell,
}: {
  canManage: boolean;
  collapseClass: boolean;
  onOpenCell: (t: MasterEditTarget) => void;
}) {
  const { data: classes } = useClasses();
  const { data, isLoading } = useTimetableMaster();

  // Lookup by "classSlug|sectionCode|periodId".
  const cellByKey = useMemo(() => {
    const m = new Map<string, TimetableMasterCell>();
    for (const c of data?.cells ?? []) {
      m.set(`${c.classSlug}|${c.sectionCode}|${c.periodId}`, c);
    }
    return m;
  }, [data]);

  // Sections grouped by class, in display order. For the collapsed view
  // these become the columns; for the section view they're used to look
  // up the "all sections in this class" set when the user clicks a cell.
  const classGroups = useMemo(() => {
    const order: string[] = [];
    const byClass = new Map<string, { classSlug: string; className: string; sortOrder: number; sections: string[] }>();
    for (const s of data?.sections ?? []) {
      if (!byClass.has(s.classSlug)) {
        const cls = classes?.find((c) => c.slug === s.classSlug);
        byClass.set(s.classSlug, {
          classSlug: s.classSlug,
          className: cls?.name ?? s.classSlug,
          sortOrder: s.classSortOrder,
          sections: [],
        });
        order.push(s.classSlug);
      }
      byClass.get(s.classSlug)!.sections.push(s.sectionCode);
    }
    return order.map((slug) => byClass.get(slug)!);
  }, [data, classes]);

  // Coverage across the whole school.
  const coverage = useMemo(() => {
    if (!data) return null;
    const teaching = data.periods.filter((p) => !p.isBreak).length;
    const total = teaching * data.sections.length;
    if (total === 0) return null;
    const filled = data.cells.filter((c) => {
      const p = data.periods.find((pp) => pp.id === c.periodId);
      return p && !p.isBreak && (c.subjectId != null || c.teacherUserId != null);
    }).length;
    return { total, filled, pct: Math.round((filled / total) * 100) };
  }, [data]);

  if (isLoading) return <p className="muted">Loading…</p>;
  if (!data) return null;

  if (data.sections.length === 0) {
    return (
      <div className="card" style={{ padding: "40px 24px", textAlign: "center" }}>
        <div className="label" style={{ marginBottom: 6 }}>NO SECTIONS</div>
        <div className="muted body-s">
          Add classes and sections first under <b>Classes & Sections</b>.
        </div>
      </div>
    );
  }

  /** Build the click handler for one (classSlug, period). Looks up every
   *  section of the class so the editor can render section checkboxes. */
  function openClassCell(classSlug: string, className: string, period: TimetablePeriod) {
    const group = classGroups.find((g) => g.classSlug === classSlug);
    if (!group) return;
    const sections = group.sections.map((sc) => ({
      sectionCode: sc,
      cell: cellByKey.get(`${classSlug}|${sc}|${period.id}`) ?? null,
    }));
    onOpenCell({
      period,
      classSlug,
      className,
      sections,
      defaultSelectedCodes: group.sections,        // all sections checked
      prefillFromSelected: true,
    });
  }

  /** Click handler for one (section, period) in the section view. */
  function openSectionCell(classSlug: string, sectionCode: string, period: TimetablePeriod) {
    const group = classGroups.find((g) => g.classSlug === classSlug);
    if (!group) return;
    const sections = group.sections.map((sc) => ({
      sectionCode: sc,
      cell: cellByKey.get(`${classSlug}|${sc}|${period.id}`) ?? null,
    }));
    onOpenCell({
      period,
      classSlug,
      className: group.className,
      sections,
      defaultSelectedCodes: [sectionCode],         // only the clicked section
      prefillFromSelected: true,
    });
  }

  return (
    <div className="tt-card card">
      <div className="tt-hint">
        <Icon name={canManage ? "edit" : "info"} size={12} />
        <span>
          {canManage
            ? collapseClass
              ? "Click any class cell to assign — you'll choose which sections to apply it to."
              : "Click any cell to assign — the same subject + teacher applies to every day Mon–Sat."
            : "Read-only view. The same assignment shows for every day Mon–Sat."}
          {coverage && (
            <>
              {"  ·  "}
              <b>{coverage.filled}/{coverage.total}</b> slots filled ({coverage.pct}%)
            </>
          )}
        </span>
      </div>

      <div className="tt-scroll">
        {collapseClass ? (
          <ClassCollapsedGrid
            periods={data.periods}
            classGroups={classGroups}
            cellByKey={cellByKey}
            canManage={canManage}
            onOpenClassCell={openClassCell}
          />
        ) : (
          <SectionGrid
            periods={data.periods}
            sections={data.sections}
            cellByKey={cellByKey}
            canManage={canManage}
            onOpenSectionCell={openSectionCell}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Master sub-grids                                                    */
/* ------------------------------------------------------------------ */

function SectionGrid({
  periods, sections, cellByKey, canManage, onOpenSectionCell,
}: {
  periods: TimetablePeriod[];
  sections: { classSlug: string; sectionCode: string; label: string }[];
  cellByKey: Map<string, TimetableMasterCell>;
  canManage: boolean;
  onOpenSectionCell: (classSlug: string, sectionCode: string, period: TimetablePeriod) => void;
}) {
  return (
    <table className="tt-grid tt-grid--master">
      <thead>
        <tr>
          <th className="tt-grid__period-head">Period</th>
          {sections.map((s, i) => {
            const next = sections[i + 1];
            const isClassEnd = !!next && next.classSlug !== s.classSlug;
            return (
              <th
                key={s.label}
                title={s.label}
                className={isClassEnd ? "tt-grid__class-end" : undefined}
              >
                {s.label}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {periods.map((p) => (
          <tr key={p.id} className={p.isBreak ? "tt-row--break" : ""}>
            <th className="tt-grid__period">
              <div className="tt-grid__period-name">{p.name}</div>
              <div className="muted mono tt-grid__period-time">
                {p.startTime.slice(0, 5)}–{p.endTime.slice(0, 5)}
              </div>
            </th>
            {sections.map((s, i) => {
              const next = sections[i + 1];
              const isClassEnd = !!next && next.classSlug !== s.classSlug;
              if (p.isBreak) {
                return (
                  <td key={s.label} className={"tt-grid__cell tt-grid__cell--break " + (isClassEnd ? "tt-grid__class-end " : "")}>
                    <span>break</span>
                  </td>
                );
              }
              const cell = cellByKey.get(`${s.classSlug}|${s.sectionCode}|${p.id}`) ?? null;
              const isEditable = canManage;
              return (
                <td
                  key={s.label}
                  className={
                    "tt-grid__cell " +
                    (cell ? "tt-grid__cell--filled " : "tt-grid__cell--empty ") +
                    (isEditable ? "tt-grid__cell--editable " : "") +
                    (cell?.mixed ? "tt-grid__cell--mixed " : "") +
                    (isClassEnd ? "tt-grid__class-end " : "")
                  }
                  onClick={isEditable ? () => onOpenSectionCell(s.classSlug, s.sectionCode, p) : undefined}
                  role={isEditable ? "button" : undefined}
                  tabIndex={isEditable ? 0 : undefined}
                  onKeyDown={isEditable ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenSectionCell(s.classSlug, s.sectionCode, p);
                    }
                  } : undefined}
                >
                  {cell ? (
                    <MasterCellContent cell={cell} />
                  ) : isEditable ? (
                    <div className="tt-cell-add"><Icon name="plus" size={12} /> assign</div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Compute the "consensus" assignment across a class's sections for one
 * period. If every section has the same subject+teacher+room+notes, we
 * surface that as a single cell; otherwise we flag the slot as varies.
 */
function consensusCell(
  cells: (TimetableMasterCell | null)[],
): { cell: TimetableMasterCell | null; filled: number; total: number; varies: boolean } {
  const total = cells.length;
  const populated = cells.filter((c): c is TimetableMasterCell =>
    !!c && (c.subjectId != null || c.teacherUserId != null || !!c.room || !!c.notes || c.subjectId2 != null || c.teacherUserId2 != null),
  );
  const filled = populated.length;
  const first = populated[0];
  if (!first) return { cell: null, filled: 0, total, varies: false };
  const fp = (c: TimetableMasterCell) =>
    [c.subjectId ?? "", c.teacherUserId ?? "", c.subjectId2 ?? "", c.teacherUserId2 ?? "", c.room ?? "", c.notes ?? ""].join("·");
  const varies = populated.some((c) => fp(c) !== fp(first)) || filled < total;
  return { cell: first, filled, total, varies };
}

function ClassCollapsedGrid({
  periods, classGroups, cellByKey, canManage, onOpenClassCell,
}: {
  periods: TimetablePeriod[];
  classGroups: { classSlug: string; className: string; sections: string[] }[];
  cellByKey: Map<string, TimetableMasterCell>;
  canManage: boolean;
  onOpenClassCell: (classSlug: string, className: string, period: TimetablePeriod) => void;
}) {
  return (
    <table className="tt-grid tt-grid--master tt-grid--collapsed">
      <thead>
        <tr>
          <th className="tt-grid__period-head">Period</th>
          {classGroups.map((g) => (
            <th key={g.classSlug} title={`${g.className} · ${g.sections.length} section${g.sections.length === 1 ? "" : "s"}`}>
              <div>{g.className}</div>
              <div className="muted body-s tt-grid__class-meta">
                {g.sections.length}×{g.sections.join("/")}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {periods.map((p) => (
          <tr key={p.id} className={p.isBreak ? "tt-row--break" : ""}>
            <th className="tt-grid__period">
              <div className="tt-grid__period-name">{p.name}</div>
              <div className="muted mono tt-grid__period-time">
                {p.startTime.slice(0, 5)}–{p.endTime.slice(0, 5)}
              </div>
            </th>
            {classGroups.map((g) => {
              if (p.isBreak) {
                return (
                  <td key={g.classSlug} className="tt-grid__cell tt-grid__cell--break">
                    <span>break</span>
                  </td>
                );
              }
              const cells = g.sections.map((sc) => cellByKey.get(`${g.classSlug}|${sc}|${p.id}`) ?? null);
              const { cell, filled, total, varies } = consensusCell(cells);
              const isEditable = canManage;
              return (
                <td
                  key={g.classSlug}
                  className={
                    "tt-grid__cell " +
                    (cell ? "tt-grid__cell--filled " : "tt-grid__cell--empty ") +
                    (isEditable ? "tt-grid__cell--editable " : "") +
                    (varies ? "tt-grid__cell--mixed " : "")
                  }
                  onClick={isEditable ? () => onOpenClassCell(g.classSlug, g.className, p) : undefined}
                  role={isEditable ? "button" : undefined}
                  tabIndex={isEditable ? 0 : undefined}
                  onKeyDown={isEditable ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpenClassCell(g.classSlug, g.className, p);
                    }
                  } : undefined}
                  title={varies
                    ? `${filled}/${total} sections — assignments differ`
                    : filled === 0 ? "Not assigned in any section" : `Same in all ${total} sections`}
                >
                  {cell ? (
                    <div className="tt-cell">
                      {varies && (
                        <div className="tt-cell__mixed-flag" title="Some sections differ from this assignment">
                          <Icon name="alert" size={10} /> varies · {filled}/{total}
                        </div>
                      )}
                      <div className="tt-cell__subject">{cell.subjectName ?? "—"}</div>
                      <div className="tt-cell__teacher muted">{cell.teacherName ?? "—"}</div>
                      {(cell.subjectName2 || cell.teacherName2) && (
                        <div className="tt-cell__second muted">
                          + {cell.subjectName2 ?? "—"}
                          {cell.teacherName2 && ` · ${cell.teacherName2}`}
                        </div>
                      )}
                      {cell.room && (
                        <div className="tt-cell__room mono muted">
                          <Icon name="map-pin" size={10} /> {cell.room}
                        </div>
                      )}
                    </div>
                  ) : isEditable ? (
                    <div className="tt-cell-add"><Icon name="plus" size={12} /> assign</div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MasterCellContent({ cell }: { cell: TimetableMasterCell }) {
  return (
    <div className="tt-cell">
      {cell.mixed && (
        <div className="tt-cell__mixed-flag" title="Days don't all match — saving here will overwrite every day">
          <Icon name="alert" size={10} /> mixed
        </div>
      )}
      <div className="tt-cell__subject">{cell.subjectName ?? "—"}</div>
      <div className="tt-cell__teacher muted">{cell.teacherName ?? "—"}</div>
      {(cell.subjectName2 || cell.teacherName2) && (
        <div className="tt-cell__second muted">
          + {cell.subjectName2 ?? "—"}
          {cell.teacherName2 && ` · ${cell.teacherName2}`}
        </div>
      )}
      {cell.room && (
        <div className="tt-cell__room mono muted">
          <Icon name="map-pin" size={10} /> {cell.room}
        </div>
      )}
    </div>
  );
}

function MasterCellEditorModal({
  target, onClose, onSaved,
}: {
  target: MasterEditTarget;
  onClose: () => void;
  /** sections = how many were affected, days = how many days each */
  onSaved: (action: "saved" | "deleted", sections: number, days: number) => void;
}) {
  const { period, classSlug, className, sections, defaultSelectedCodes, prefillFromSelected } = target;

  const { data: allSubjects } = useExamSubjects();
  const { data: team }        = usePickableTeam();
  const saveBulk              = useSaveMasterCellBulk();
  const removeBulk            = useDeleteMasterCellBulk();

  const eligibleSubjects = useMemo(() => {
    const list = allSubjects ?? [];
    const mapped = list.filter((s) => s.classes.includes(classSlug));
    return mapped.length > 0 ? mapped : list;
  }, [allSubjects, classSlug]);

  const teachers = useMemo(() => {
    return (team?.items ?? [])
      .filter((u) =>
        (u.designation ?? "").toLowerCase().includes("teacher") ||
        u.roleSlug === "teacher" ||
        !!u.classTeacherOf,
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [team]);

  // Pre-fill from the consensus of currently-selected sections (so when
  // you click an already-filled cell, the form starts with its values).
  const seed = useMemo(() => {
    if (!prefillFromSelected) return null;
    const picked = sections.filter((s) => defaultSelectedCodes.includes(s.sectionCode)).map((s) => s.cell);
    const { cell } = consensusCell(picked);
    return cell;
  }, [sections, defaultSelectedCodes, prefillFromSelected]);

  const [selectedCodes, setSelectedCodes] = useState<string[]>(defaultSelectedCodes);
  const [subjectId, setSubjectId]         = useState<string>(seed?.subjectId      ? String(seed.subjectId)      : "");
  const [teacherUserId, setTeacherUid]    = useState<string>(seed?.teacherUserId  ? String(seed.teacherUserId)  : "");
  const [subjectId2, setSubjectId2]       = useState<string>(seed?.subjectId2     ? String(seed.subjectId2)     : "");
  const [teacherUserId2, setTeacherUid2]  = useState<string>(seed?.teacherUserId2 ? String(seed.teacherUserId2) : "");
  const [room, setRoom]                   = useState<string>(seed?.room ?? "");
  const [notes, setNotes]                 = useState<string>(seed?.notes ?? "");
  const [showSecond, setShowSecond]       = useState<boolean>(!!(seed?.subjectId2 || seed?.teacherUserId2));
  const [err, setErr]                     = useState<string | null>(null);

  // Any already-filled selected section, used to enable the "clear" button.
  const anySelectedFilled = sections.some((s) =>
    selectedCodes.includes(s.sectionCode) && s.cell != null,
  );

  // Surface day-mixing on any selected section so the user knows saving
  // here flattens variation.
  const anyMixed = sections.some((s) => selectedCodes.includes(s.sectionCode) && s.cell?.mixed);

  function toggleSection(code: string) {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }
  function selectAll()  { setSelectedCodes(sections.map((s) => s.sectionCode)); }
  function selectNone() { setSelectedCodes([]); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (selectedCodes.length === 0) {
      setErr("Pick at least one section to save to.");
      return;
    }
    try {
      const res = await saveBulk.mutateAsync({
        targets: selectedCodes.map((sc) => ({ classSlug, sectionCode: sc })),
        periodId: period.id,
        subjectId:      subjectId      ? Number(subjectId)      : null,
        teacherUserId:  teacherUserId  ? Number(teacherUserId)  : null,
        subjectId2:     showSecond && subjectId2     ? Number(subjectId2)     : null,
        teacherUserId2: showSecond && teacherUserId2 ? Number(teacherUserId2) : null,
        room:  room.trim()  || null,
        notes: notes.trim() || null,
      });
      onSaved("saved", res.sectionsWritten, res.daysWritten);
      onClose();
    } catch (e) {
      setErr(getErrorMessage(e, "Failed to save cell"));
    }
  }

  async function onClear() {
    if (selectedCodes.length === 0) return;
    const summary = selectedCodes.length === sections.length
      ? `every section of ${className}`
      : selectedCodes.length === 1
        ? `${classSlug}-${selectedCodes[0]}`
        : `${selectedCodes.length} sections`;
    if (!confirm(`Clear ${period.name} from ${summary} (all days Mon–Sat)?`)) return;
    try {
      const res = await removeBulk.mutateAsync({
        targets: selectedCodes.map((sc) => ({ classSlug, sectionCode: sc })),
        periodId: period.id,
      });
      onSaved("deleted", res.sectionsDeleted, 6);
      onClose();
    } catch (e) {
      setErr(getErrorMessage(e, "Failed to clear"));
    }
  }

  const isSingleSection = sections.length === 1;
  const firstSection = sections[0];
  const title = isSingleSection && firstSection
    ? `${classSlug}-${firstSection.sectionCode} · ${period.name}`
    : `${className} · ${period.name}`;

  return (
    <Modal
      open
      title={`${title} · Mon–Sat`}
      onClose={onClose}
      size="lg"
      actions={
        <>
          {anySelectedFilled && (
            <button type="button" className="btn btn--danger" onClick={onClear} style={{ marginRight: "auto" }}>
              Clear selected
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="master-cell-form" className="btn btn--primary" disabled={saveBulk.isPending || selectedCodes.length === 0}>
            {saveBulk.isPending
              ? "Saving…"
              : `Save to ${selectedCodes.length} section${selectedCodes.length === 1 ? "" : "s"}`}
          </button>
        </>
      }
    >
      <form id="master-cell-form" onSubmit={onSubmit} className="form-grid form-grid--2">
        {/* Section picker — list of all sections in the class with check-
            boxes. For single-section opens (clicked from the section grid)
            this still renders so the user can extend the assignment to
            sibling sections in one shot. */}
        {sections.length > 1 && (
          <div className="field span-2 tt-sec-picker">
            <div className="tt-sec-picker__head">
              <span className="field__label" style={{ margin: 0 }}>Apply to sections of {className}</span>
              <div className="tt-sec-picker__actions">
                <button type="button" className="link-btn" onClick={selectAll}>All</button>
                <span className="muted">·</span>
                <button type="button" className="link-btn" onClick={selectNone}>None</button>
              </div>
            </div>
            <div className="tt-sec-picker__chips">
              {sections.map((s) => {
                const checked = selectedCodes.includes(s.sectionCode);
                const hasCell = s.cell != null;
                return (
                  <label
                    key={s.sectionCode}
                    className={"tt-sec-chip " + (checked ? "tt-sec-chip--on " : "") + (hasCell ? "tt-sec-chip--filled" : "")}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSection(s.sectionCode)}
                    />
                    <span>{classSlug}-{s.sectionCode}</span>
                    {hasCell && s.cell?.subjectName && (
                      <span className="tt-sec-chip__note">{s.cell.subjectName}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {anyMixed && (
          <div className="banner banner--warn" style={{ gridColumn: "1 / -1" }}>
            <Icon name="alert" size={14} />
            <span>
              Some selected sections already have day-to-day variation. Saving here will
              <b> overwrite every day Mon–Sat</b> in the selected sections with the values below.
            </span>
          </div>
        )}

        <div className="field">
          <label className="field__label" htmlFor="mc-subject">Subject</label>
          <select
            id="mc-subject"
            className="select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
          >
            <option value="">— No subject —</option>
            {eligibleSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.shortCode})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="mc-teacher">Teacher</label>
          <select
            id="mc-teacher"
            className="select"
            value={teacherUserId}
            onChange={(e) => setTeacherUid(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {teachers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.department ? ` · ${u.department}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="mc-room">Room</label>
          <input
            id="mc-room"
            className="input mono"
            placeholder="e.g. R-204"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            maxLength={40}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="mc-notes">Notes</label>
          <input
            id="mc-notes"
            className="input"
            placeholder="optional"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={120}
          />
        </div>

        <div className="field span-2">
          <label className="check" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={showSecond}
              onChange={(e) => setShowSecond(e.target.checked)}
            />
            <span>Add a <b>parallel slot</b> (e.g. split class: language A vs language B)</span>
          </label>
        </div>

        {showSecond && (
          <>
            <div className="field">
              <label className="field__label" htmlFor="mc-subject2">Subject (2nd)</label>
              <select
                id="mc-subject2"
                className="select"
                value={subjectId2}
                onChange={(e) => setSubjectId2(e.target.value)}
              >
                <option value="">— No subject —</option>
                {eligibleSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.shortCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="mc-teacher2">Teacher (2nd)</label>
              <select
                id="mc-teacher2"
                className="select"
                value={teacherUserId2}
                onChange={(e) => setTeacherUid2(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {teachers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.department ? ` · ${u.department}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {err && (
          <div className="banner banner--error" style={{ gridColumn: "1 / -1" }}>
            <Icon name="alert" size={14} /><span>{err}</span>
          </div>
        )}

        <div className="muted body-s" style={{ gridColumn: "1 / -1" }}>
          {period.startTime.slice(0, 5)}–{period.endTime.slice(0, 5)} · Period {period.periodNo} · writes
          {" "}
          <b style={{ color: "var(--ink)" }}>
            {selectedCodes.length} section{selectedCodes.length === 1 ? "" : "s"} × 6 days
          </b>
          {" "}({selectedCodes.length * 6} cells)
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Auto-fill modal                                                     */
/* ------------------------------------------------------------------ */

function AutoFillModal({
  onClose, onDone,
}: {
  onClose: () => void;
  onDone: (r: { cellsWritten: number; cellsSkipped: number; sectionsAffected: number; periodsFilled: number }) => void;
}) {
  const { data: classes } = useClasses();
  const { data: allSubjects } = useExamSubjects();
  const fill = useAutoFillClass();

  const [classSlug, setClassSlug]     = useState<string>("");
  const [sectionCodes, setSecs]       = useState<string[]>([]);
  const [subjectIds, setSubs]         = useState<number[]>([]);
  const [overwrite, setOverwrite]     = useState<boolean>(false);
  const [err, setErr]                 = useState<string | null>(null);

  // Sections of the currently-picked class.
  const classObj = useMemo(() => classes?.find((c) => c.slug === classSlug), [classes, classSlug]);
  const allSectionCodes = classObj?.sections.map((s) => s.code) ?? [];

  // Subjects mapped to this class (from exam_class_subjects), preferred;
  // fall back to all subjects.
  const candidateSubjects = useMemo(() => {
    const list = allSubjects ?? [];
    const mapped = list.filter((s) => s.classes.includes(classSlug));
    return mapped.length > 0 ? mapped : list;
  }, [allSubjects, classSlug]);

  // When the class changes, reset selections to "all".
  function onPickClass(slug: string) {
    setClassSlug(slug);
    const cls = classes?.find((c) => c.slug === slug);
    setSecs(cls?.sections.map((s) => s.code) ?? []);
    const mapped = (allSubjects ?? []).filter((s) => s.classes.includes(slug));
    const candidates = mapped.length > 0 ? mapped : (allSubjects ?? []);
    setSubs(candidates.map((s) => s.id));
  }

  function toggleSec(code: string) {
    setSecs((prev) => prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]);
  }
  function toggleSub(id: number) {
    setSubs((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!classSlug) { setErr("Pick a class first."); return; }
    if (sectionCodes.length === 0) { setErr("Pick at least one section."); return; }
    if (subjectIds.length === 0) { setErr("Pick at least one subject to distribute."); return; }
    try {
      const res = await fill.mutateAsync({
        classSlug,
        sectionCodes,
        subjectIds,
        overwrite,
      });
      onDone(res);
      onClose();
    } catch (e) {
      setErr(getErrorMessage(e, "Auto-fill failed"));
    }
  }

  return (
    <Modal
      open
      title="Auto-fill class subjects"
      onClose={onClose}
      size="lg"
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button
            type="submit"
            form="autofill-form"
            className="btn btn--primary"
            disabled={fill.isPending || !classSlug || sectionCodes.length === 0 || subjectIds.length === 0}
          >
            {fill.isPending ? "Filling…" : "Auto-fill"}
          </button>
        </>
      }
    >
      <form id="autofill-form" onSubmit={onSubmit} className="form-grid form-grid--2">
        <div className="banner banner--info" style={{ gridColumn: "1 / -1" }}>
          <Icon name="info" size={14} />
          <span>
            Distributes the chosen subjects across every <b>teaching period</b> for the chosen sections,
            rotating in order. Teachers are <b>not</b> auto-assigned — you'll add those manually.
            Writes apply to all 6 days Mon–Sat.
          </span>
        </div>

        <div className="field span-2">
          <label className="field__label field__label--req" htmlFor="af-class">Class</label>
          <select
            id="af-class"
            className="select"
            value={classSlug}
            onChange={(e) => onPickClass(e.target.value)}
            required
          >
            <option value="">— Pick a class —</option>
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name} ({c.sections.length} section{c.sections.length === 1 ? "" : "s"})
              </option>
            ))}
          </select>
        </div>

        {classSlug && (
          <>
            <div className="field span-2 tt-sec-picker">
              <div className="tt-sec-picker__head">
                <span className="field__label" style={{ margin: 0 }}>Sections</span>
                <div className="tt-sec-picker__actions">
                  <button type="button" className="link-btn" onClick={() => setSecs(allSectionCodes)}>All</button>
                  <span className="muted">·</span>
                  <button type="button" className="link-btn" onClick={() => setSecs([])}>None</button>
                </div>
              </div>
              <div className="tt-sec-picker__chips">
                {allSectionCodes.map((sc) => {
                  const checked = sectionCodes.includes(sc);
                  return (
                    <label key={sc} className={"tt-sec-chip " + (checked ? "tt-sec-chip--on" : "")}>
                      <input type="checkbox" checked={checked} onChange={() => toggleSec(sc)} />
                      <span>{classSlug}-{sc}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="field span-2 tt-sec-picker">
              <div className="tt-sec-picker__head">
                <span className="field__label" style={{ margin: 0 }}>Subjects to distribute (in rotation order)</span>
                <div className="tt-sec-picker__actions">
                  <button type="button" className="link-btn" onClick={() => setSubs(candidateSubjects.map((s) => s.id))}>All</button>
                  <span className="muted">·</span>
                  <button type="button" className="link-btn" onClick={() => setSubs([])}>None</button>
                </div>
              </div>
              {candidateSubjects.length === 0 ? (
                <div className="muted body-s">
                  No subjects mapped to this class yet. Map subjects under <b>Exams → Subjects</b> first.
                </div>
              ) : (
                <div className="tt-sec-picker__chips">
                  {candidateSubjects.map((s) => {
                    const checked = subjectIds.includes(s.id);
                    return (
                      <label key={s.id} className={"tt-sec-chip " + (checked ? "tt-sec-chip--on" : "")}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSub(s.id)} />
                        <span>{s.name}</span>
                        <span className="tt-sec-chip__note">({s.shortCode})</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="field span-2">
              <label className="check" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                />
                <span>
                  <b>Overwrite</b> cells that already have a subject set
                  {" "}<span className="muted body-s">(default: skip filled cells)</span>
                </span>
              </label>
            </div>
          </>
        )}

        {err && (
          <div className="banner banner--error" style={{ gridColumn: "1 / -1" }}>
            <Icon name="alert" size={14} /><span>{err}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const TT_CSS = `
  .tt-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .tt-coverage {
    margin-left: auto;
    display: inline-flex;
    align-items: baseline;
    gap: 6px;
  }
  .tt-coverage .label { color: var(--ink-60); }

  .tt-card { padding: 0; overflow: hidden; }
  .tt-hint {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 14px;
    background: var(--cream-soft);
    border-bottom: 1px solid var(--rule-soft);
    color: var(--ink-70);
    font-size: 12px;
  }
  .tt-scroll { overflow-x: auto; }

  .tt-grid {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    min-width: 720px;
    table-layout: fixed;
  }
  .tt-grid thead th {
    position: sticky; top: 0;
    background: var(--cream);
    border-bottom: 1px solid var(--rule);
    text-align: center;
    font-size: 11px;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: var(--ink-60);
    padding: 8px 6px;
    z-index: 1;
  }
  .tt-grid__period-head { text-align: left !important; padding-left: 14px !important; width: 130px; }

  .tt-grid tbody th.tt-grid__period {
    text-align: left;
    padding: 10px 14px;
    background: var(--cream-soft);
    border-bottom: 1px solid var(--rule-soft);
    vertical-align: top;
    width: 130px;
  }
  .tt-grid__period-name { font-weight: 700; font-size: 13px; color: var(--ink); }
  .tt-grid__period-time { font-size: 11px; }

  .tt-grid__cell {
    border-bottom: 1px solid var(--rule-soft);
    border-left: 1px solid var(--rule-soft);
    padding: 8px 10px;
    vertical-align: top;
    min-height: 72px;
    height: 72px;
    transition: background .12s ease, box-shadow .12s ease;
  }
  .tt-grid__cell--filled  { background: var(--white); }
  .tt-grid__cell--empty   { background: var(--cream-soft); }
  .tt-grid__cell--editable { cursor: pointer; }
  .tt-grid__cell--editable:hover {
    background: var(--tint-wheat);
    box-shadow: inset 0 0 0 2px var(--orange);
  }
  .tt-grid__cell--editable:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--orange-deep);
  }
  .tt-grid__cell--break {
    background: repeating-linear-gradient(45deg,
      var(--cream-soft), var(--cream-soft) 8px,
      var(--cream) 8px, var(--cream) 16px);
    text-align: center;
    color: var(--ink-60);
    font-style: italic;
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
  }

  .tt-cell { display: flex; flex-direction: column; gap: 1px; line-height: 1.25; }
  .tt-cell__section { font-size: 10px; letter-spacing: .04em; color: var(--ink-60); text-transform: uppercase; }
  .tt-cell__subject { font-weight: 600; font-size: 13px; color: var(--ink); }
  .tt-cell__teacher { font-size: 11px; }
  .tt-cell__second  { font-size: 11px; padding-top: 2px; border-top: 1px dashed var(--rule-soft); margin-top: 3px; }
  .tt-cell__room    { font-size: 10px; display: inline-flex; align-items: center; gap: 2px; }

  .tt-cell-add {
    display: flex; align-items: center; justify-content: center; gap: 4px;
    height: 100%; min-height: 56px;
    color: var(--ink-60);
    border: 1px dashed var(--rule);
    border-radius: 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .04em;
    opacity: .55;
    transition: opacity .12s ease, color .12s ease, border-color .12s ease;
  }
  .tt-grid__cell--editable:hover .tt-cell-add {
    opacity: 1;
    color: var(--orange-deep);
    border-color: var(--orange);
  }

  .seg-btn-group { display: inline-flex; gap: 4px; }

  /* Master view (periods × sections). Many schools have 40–60+
     section columns, so we let the table grow as wide as it needs
     (no table-layout: fixed) and pin the period column to the
     left so it never scrolls off-screen. */
  .tt-grid--master {
    min-width: 0;
    table-layout: auto;
    width: max-content;        /* shrink-wrap to the widest row */
  }
  .tt-grid--master thead th {
    min-width: 130px;
    white-space: nowrap;
    padding: 10px 12px;
    font-size: 12px;           /* a touch bigger — easier to scan */
    letter-spacing: .02em;
  }
  /* Sticky period column — head + body cells. */
  .tt-grid--master thead th.tt-grid__period-head {
    position: sticky;
    left: 0;
    z-index: 3;
    background: var(--cream);
    box-shadow: 1px 0 0 var(--rule);
    min-width: 140px;
  }
  .tt-grid--master tbody th.tt-grid__period {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--cream-soft);
    box-shadow: 1px 0 0 var(--rule-soft);
    min-width: 140px;
  }
  /* Cells stay a sensible width and ellipsis long content instead
     of letting it spill across columns. */
  .tt-grid--master .tt-grid__cell {
    min-width: 130px;
    max-width: 180px;
    vertical-align: top;
  }
  .tt-grid--master .tt-cell { min-width: 0; }
  .tt-grid--master .tt-cell__subject,
  .tt-grid--master .tt-cell__teacher,
  .tt-grid--master .tt-cell__second,
  .tt-grid--master .tt-cell__room {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  /* At 480+ empty cells the dashed "+ assign" chip is visual noise.
     Hide it in master view; the hover state still indicates clickability. */
  .tt-grid--master .tt-grid__cell--empty .tt-cell-add { display: none; }
  .tt-grid--master .tt-grid__cell--empty {
    background:
      radial-gradient(circle, var(--rule-soft) 1px, transparent 1px) center / 8px 8px,
      var(--cream-soft);
  }

  /* Thicker right-border between classes (e.g. between 6-E and 7-A)
     so the eye can find the class boundary in a sea of sections. */
  .tt-grid--master .tt-grid__class-end {
    border-right: 2px solid var(--rule) !important;
  }

  /* Class-collapsed view — wider class columns + meta line in the head. */
  .tt-grid--collapsed thead th { min-width: 170px; }
  .tt-grid--collapsed .tt-grid__cell { min-width: 170px; max-width: 220px; }
  .tt-grid__class-meta {
    font-size: 10px;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    margin-top: 2px;
  }

  /* Section-picker chips (used in cell editor + auto-fill modal). */
  .tt-sec-picker__head {
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px; margin-bottom: 6px;
  }
  .tt-sec-picker__actions {
    display: inline-flex; gap: 6px; align-items: center;
    font-size: 12px;
  }
  .tt-sec-picker__actions .link-btn {
    background: transparent; border: 0; padding: 0;
    color: var(--orange-deep); cursor: pointer;
    font: inherit; text-decoration: underline;
  }
  .tt-sec-picker__chips {
    display: flex; flex-wrap: wrap; gap: 6px;
  }
  .tt-sec-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 5px 10px;
    border: 1px solid var(--rule);
    border-radius: 999px;
    background: var(--white);
    font-size: 12px;
    cursor: pointer;
    user-select: none;
    transition: background .12s ease, border-color .12s ease;
  }
  .tt-sec-chip input[type=checkbox] {
    accent-color: var(--orange-deep);
    margin: 0;
  }
  .tt-sec-chip--on {
    background: var(--tint-wheat);
    border-color: var(--orange);
  }
  .tt-sec-chip--filled span:first-of-type { font-weight: 600; }
  .tt-sec-chip__note {
    font-size: 10px;
    color: var(--ink-60);
    text-transform: uppercase;
    letter-spacing: .03em;
  }

  .tt-grid__cell--mixed {
    background: linear-gradient(0deg, rgba(245, 158, 11, .08), rgba(245, 158, 11, .08)),
                var(--white);
  }
  .tt-cell__mixed-flag {
    display: inline-flex; align-items: center; gap: 2px;
    font-size: 9px;
    color: var(--warn, #b45309);
    text-transform: uppercase;
    letter-spacing: .04em;
    line-height: 1;
    margin-bottom: 2px;
  }
`;
