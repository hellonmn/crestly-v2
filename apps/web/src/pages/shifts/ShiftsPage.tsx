import { useState } from "react";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { Modal } from "@/components/Modal";
import { useBulkHours, useBulkSalary, useSaveShift, useShifts } from "./hooks";
import { getErrorMessage } from "@/lib/api";
import type { ShiftRow } from "@crestly/shared";

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

export function ShiftsPage() {
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const { data, isLoading } = useShifts({ q: q || undefined, department: department || undefined });

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<ShiftRow | null>(null);
  const [bulk, setBulk] = useState<"hours" | "salary" | null>(null);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (!data) return;
    setSelected((prev) => prev.size === data.rows.length ? new Set() : new Set(data.rows.map((r) => r.userId)));
  }

  return (
    <>
      <PageHead
        group="HR"
        title="Duty Hours"
        lede={data ? `${data.withSchedule} of ${data.total} staff have a schedule.` : "Loading…"}
        actions={
          <>
            <button className="btn btn--ghost btn--sm" disabled={selected.size === 0} onClick={() => setBulk("hours")}>
              <Icon name="features" size={14} /> Bulk hours ({selected.size})
            </button>
            <button className="btn btn--ghost btn--sm" disabled={selected.size === 0} onClick={() => setBulk("salary")}>
              <Icon name="rupee" size={14} /> Bulk salary ({selected.size})
            </button>
          </>
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mustard" icon="team" label="STAFF" value={String(data?.total ?? "—")} delta="" />
        <StatTile tint="mint" icon="check" label="WITH SCHEDULE" value={String(data?.withSchedule ?? "—")} delta="" />
        <StatTile tint="rose" icon="alert" label="WITHOUT" value={String(data?.withoutSchedule ?? "—")} delta="needs setup" />
        <StatTile tint="wheat" icon="info" label="SELECTED" value={String(selected.size)} delta="for bulk ops" />
      </div>

      <div className="toolbar card">
        <div className="search">
          <Icon name="search" size={14} />
          <input type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14 }} />
        </div>
        <input className="input" placeholder="Department" value={department} onChange={(e) => setDepartment(e.target.value)} style={{ maxWidth: 180 }} />
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input type="checkbox" checked={selected.size === (data?.rows.length ?? 0) && selected.size > 0} onChange={toggleAll} />
              </th>
              <th>Name</th>
              <th>Department · Designation</th>
              <th>Monthly</th>
              <th>Duty</th>
              <th>Effective from</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>}
            {data?.rows.map((r) => (
              <tr key={r.userId}>
                <td><input type="checkbox" checked={selected.has(r.userId)} onChange={() => toggle(r.userId)} /></td>
                <td className="td-name">{r.name}</td>
                <td className="muted">{r.department ?? "—"}{r.designation ? ` · ${r.designation}` : ""}</td>
                <td className="mono">{r.monthlySalary != null ? fmt(r.monthlySalary) : <span className="muted">—</span>}</td>
                <td className="mono">
                  {r.dutyStart && r.dutyEnd
                    ? `${r.dutyStart.slice(0, 5)} – ${r.dutyEnd.slice(0, 5)}`
                    : <span className="pill pill--warn">NOT SET</span>}
                </td>
                <td className="mono muted">{r.effectiveFrom ?? "—"}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditing(r)}>
                    <Icon name="edit" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <SingleEditModal row={editing} onClose={() => setEditing(null)} />}
      {bulk === "hours" && <BulkHoursModal userIds={Array.from(selected)} onClose={() => setBulk(null)} />}
      {bulk === "salary" && <BulkSalaryModal userIds={Array.from(selected)} onClose={() => setBulk(null)} />}
    </>
  );
}

function SingleEditModal({ row, onClose }: { row: ShiftRow; onClose: () => void }) {
  const [start, setStart] = useState(row.dutyStart?.slice(0, 5) ?? "09:00");
  const [end, setEnd] = useState(row.dutyEnd?.slice(0, 5) ?? "16:00");
  const [eff, setEff] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState<string | null>(null);
  const save = useSaveShift();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await save.mutateAsync({
        userId: row.userId, dutyStart: start, dutyEnd: end, effectiveFrom: eff,
      });
      onClose();
    } catch (e) { setErr(getErrorMessage(e, "Failed")); }
  }

  return (
    <Modal open title={`Duty hours · ${row.name}`} onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="shift-form" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="shift-form" onSubmit={onSubmit} className="form-grid form-grid--2">
        <div className="field"><label className="field__label">Duty start</label><input className="input mono" type="time" value={start} onChange={(e) => setStart(e.target.value)} required /></div>
        <div className="field"><label className="field__label">Duty end</label><input className="input mono" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label className="field__label">Effective from</label><input className="input" type="date" value={eff} onChange={(e) => setEff(e.target.value)} required /></div>
        {err && <div className="banner banner--error" style={{ gridColumn: "1 / -1" }}><span>{err}</span></div>}
      </form>
    </Modal>
  );
}

function BulkHoursModal({ userIds, onClose }: { userIds: number[]; onClose: () => void }) {
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("16:00");
  const [eff, setEff] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState<string | null>(null);
  const bulk = useBulkHours();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await bulk.mutateAsync({ userIds, dutyStart: start, dutyEnd: end, effectiveFrom: eff });
      onClose();
    } catch (e) { setErr(getErrorMessage(e, "Failed")); }
  }

  return (
    <Modal open title={`Bulk set duty hours for ${userIds.length} staff`} onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="bulk-hours" className="btn btn--primary" disabled={bulk.isPending}>
            {bulk.isPending ? "Saving…" : `Apply to ${userIds.length}`}
          </button>
        </>
      }
    >
      <form id="bulk-hours" onSubmit={onSubmit} className="form-grid form-grid--2">
        <div className="field"><label className="field__label">Duty start</label><input className="input mono" type="time" value={start} onChange={(e) => setStart(e.target.value)} required /></div>
        <div className="field"><label className="field__label">Duty end</label><input className="input mono" type="time" value={end} onChange={(e) => setEnd(e.target.value)} required /></div>
        <div className="field" style={{ gridColumn: "1 / -1" }}><label className="field__label">Effective from</label><input className="input" type="date" value={eff} onChange={(e) => setEff(e.target.value)} required /></div>
        {err && <div className="banner banner--error" style={{ gridColumn: "1 / -1" }}><span>{err}</span></div>}
      </form>
    </Modal>
  );
}

function BulkSalaryModal({ userIds, onClose }: { userIds: number[]; onClose: () => void }) {
  const [salary, setSalary] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const bulk = useBulkSalary();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await bulk.mutateAsync({ userIds, monthlySalary: Number(salary) });
      onClose();
    } catch (e) { setErr(getErrorMessage(e, "Failed")); }
  }

  return (
    <Modal open title={`Bulk set monthly salary for ${userIds.length} staff`} onClose={onClose}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="bulk-salary" className="btn btn--primary" disabled={bulk.isPending}>
            {bulk.isPending ? "Saving…" : `Apply to ${userIds.length}`}
          </button>
        </>
      }
    >
      <form id="bulk-salary" onSubmit={onSubmit}>
        <div className="field">
          <label className="field__label">Monthly salary (₹)</label>
          <input className="input mono" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} required />
        </div>
        {err && <div className="banner banner--error"><span>{err}</span></div>}
      </form>
    </Modal>
  );
}
