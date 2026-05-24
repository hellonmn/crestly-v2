import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { Modal } from "@/components/Modal";
import {
  useDeleteCell, useSaveCell, useTimetable,
} from "./hooks";
import { useClasses } from "@/pages/classes/hooks";
import { usePickableTeam } from "@/pages/team/hooks";
import { useExamSubjects } from "@/pages/exams/hooks";
import { useAuth } from "@/lib/auth-store";
import { getErrorMessage } from "@/lib/api";
import type { TimetableCell, TimetablePeriod } from "@crestly/shared";

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

export function TimetablePage() {
  const { user } = useAuth();
  const canManage = (user?.permissions ?? []).includes("timetable.manage");

  const [scope, setScope]   = useState<"section" | "teacher">("section");
  const [classSlug, setClassSlug] = useState("");
  const [section, setSection]     = useState("");
  const [teacherUserId, setTeacherUserId] = useState<string>("");
  const [editing, setEditing] = useState<EditTarget | null>(null);
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
        </div>

        {scope === "section" ? (
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
        ) : (
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

        {coverage && (
          <div className="tt-coverage">
            <span className="label">COVERAGE</span>
            <b>{coverage.filled}/{coverage.totalSlots}</b>
            <span className="muted body-s">({coverage.pct}%)</span>
          </div>
        )}
      </div>

      {!query && !isLoading && (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center" }}>
          <div className="label" style={{ marginBottom: 6 }}>NOTHING LOADED</div>
          <div className="muted body-s">
            Pick a class + section{canManage ? " to build the timetable, " : " "}or switch to “By teacher” to see one teacher's week.
          </div>
        </div>
      )}

      {isLoading && <p className="muted">Loading…</p>}

      {data && (
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
`;
