import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useTimetable } from "./hooks";
import { useClasses } from "@/pages/classes/hooks";
import { usePickableTeam } from "@/pages/team/hooks";
import type { TimetableCell } from "@crestly/shared";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TimetablePage() {
  const [scope, setScope] = useState<"section" | "teacher">("section");
  const [classSlug, setClassSlug] = useState("");
  const [section, setSection] = useState("");
  const [teacherUserId, setTeacherUserId] = useState<string>("");

  const { data: classes } = useClasses();
  const { data: team } = usePickableTeam();

  // Sections of the currently-picked class — derived from the classes payload.
  const sectionOptions = useMemo(() => {
    if (!classSlug || !classes) return [] as string[];
    const cls = classes.find((c) => c.slug === classSlug);
    return cls?.sections.map((s) => s.code) ?? [];
  }, [classSlug, classes]);

  // Only show staff with a teacher-ish role (designation contains "teacher",
  // role slug = "teacher", or class-teacher assignment set).
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

  return (
    <>
      <PageHead
        group="RECORDS"
        title="Timetable"
        lede={data ? `${data.scope === "section" ? "Section" : "Teacher"}: ${data.scopeLabel} · Session ${data.sessionCode}` : "Pick a view to load the grid."}
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

      <div className="toolbar card">
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className={`btn btn--sm ${scope === "section" ? "btn--ink" : "btn--ghost"}`}
            onClick={() => setScope("section")}
          >
            By section
          </button>
          <button
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
            style={{ maxWidth: 260 }}
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
      </div>

      {isLoading && <p className="muted">Loading…</p>}

      {data && (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>Period</th>
                {DAYS.map((d) => <th key={d}>{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.periods.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div className="muted mono" style={{ fontSize: 11 }}>{p.startTime.slice(0, 5)}–{p.endTime.slice(0, 5)}</div>
                  </td>
                  {DAYS.map((_, i) => {
                    const day = i + 1;
                    const cell = cellLookup.get(`${day}|${p.id}`);
                    if (p.isBreak) return <td key={day} className="muted" style={{ textAlign: "center", fontStyle: "italic" }}>break</td>;
                    if (!cell) return <td key={day} className="muted" style={{ textAlign: "center" }}>—</td>;
                    return (
                      <td key={day} style={{ background: "var(--tint-wheat)" }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{cell.subjectName ?? "—"}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{cell.teacherName ?? "—"}</div>
                        {cell.room && <div className="muted mono" style={{ fontSize: 10 }}>📍 {cell.room}</div>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
