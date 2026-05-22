import { useMemo, useState } from "react";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { Modal } from "@/components/Modal";
import {
  useDeleteHoliday,
  useHolidayCalendar,
  useSaveHoliday,
} from "./hooks";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Holiday, HolidayType } from "@crestly/shared";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function HolidaysPage() {
  const { user } = useAuth();
  const isAdmin = user?.roleSlug === "admin" || user?.roleSlug === "principal";

  const [academicYear, setAcademicYear] = useState<number | undefined>();
  const { data, isLoading } = useHolidayCalendar(academicYear);
  const [adding, setAdding] = useState<Holiday | "new" | null>(null);

  // Group items by month (Apr → Mar order).
  const byMonth = useMemo(() => {
    if (!data) return [];
    const ay = data.academicYear;
    const months: { year: number; month: number; label: string; items: Holiday[] }[] = [];
    for (let i = 0; i < 12; i++) {
      const monthIdx = (3 + i) % 12;            // 3=Apr
      const year = i < 9 ? ay : ay + 1;
      months.push({ year, month: monthIdx, label: `${MONTHS[monthIdx]} ${year}`, items: [] });
    }
    for (const h of data.items) {
      const [y, m] = h.holidayDate.split("-").map(Number);
      const idx = months.findIndex((b) => b.year === y && b.month === (m! - 1));
      if (idx >= 0) months[idx]!.items.push(h);
    }
    return months;
  }, [data]);

  const currentAY = data?.academicYear ?? new Date().getFullYear();

  return (
    <>
      <PageHead
        group="HR"
        meta={`AY ${currentAY}–${(currentAY + 1).toString().slice(-2)}`}
        title="Holidays"
        lede="Academic-year calendar (April → March). Sundays auto-counted."
        actions={
          <>
            <select
              className="select"
              value={academicYear ?? currentAY}
              onChange={(e) => setAcademicYear(Number(e.target.value))}
            >
              {Array.from({ length: 4 }).map((_, i) => {
                const y = currentAY - 1 + i;
                return <option key={y} value={y}>AY {y}–{(y + 1).toString().slice(-2)}</option>;
              })}
            </select>
            {isAdmin && (
              <button className="btn btn--primary btn--sm" onClick={() => setAdding("new")}>
                <Icon name="plus" size={14} /> Add holiday
              </button>
            )}
          </>
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mustard" icon="holidays" label="TOTAL HOLIDAYS" value={String(data?.totalHolidays ?? "—")} delta="declared" />
        <StatTile tint="mint" icon="calendar" label="UPCOMING 60 DAYS" value={String(data?.upcomingIn60Days ?? "—")} delta="" />
        <StatTile tint="wheat" icon="attendance" label="SUNDAYS" value={String(data?.sundayCount ?? "—")} delta="auto-counted" />
        <StatTile tint="rose" icon="attendance" label="WORKING DAYS" value={String(data?.workingDays ?? "—")} delta="" />
      </div>

      {isLoading && <p className="muted">Loading…</p>}

      <div className="grid grid--cols-3 grid--gap-sm">
        {byMonth.map((m) => (
          <div key={`${m.year}-${m.month}`} className="card">
            <div className="label" style={{ marginBottom: 8, color: "var(--ink-40)" }}>{m.label}</div>
            {m.items.length === 0 ? (
              <p className="muted body-s" style={{ margin: 0 }}>No holidays.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {m.items.map((h) => (
                  <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="cls-pill mono" style={{ minWidth: 56, textAlign: "center" }}>
                      {h.holidayDate.slice(8, 10)}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{h.name}</div>
                      <span className={`pill ${typePillClass(h.type)}`}>{h.type.toUpperCase()}</span>
                      {h.isPaid && <span className="pill pill--mint" style={{ marginLeft: 4 }}>PAID</span>}
                    </div>
                    {isAdmin && (
                      <button className="btn btn--ghost btn--sm btn--icon-only" onClick={() => setAdding(h)} aria-label="Edit">
                        <Icon name="edit" size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <HolidayEditModal initial={adding === "new" ? null : adding} onClose={() => setAdding(null)} />
      )}
    </>
  );
}

function typePillClass(t: HolidayType): string {
  switch (t) {
    case "public": return "pill--success";
    case "school": return "pill--info";
    case "optional": return "pill--wheat";
    case "weekend": return "pill--neutral";
  }
}

function HolidayEditModal({ initial, onClose }: { initial: Holiday | null; onClose: () => void }) {
  const isNew = !initial;
  const [holidayDate, setDate] = useState(initial?.holidayDate ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<HolidayType>(initial?.type ?? "public");
  const [isPaid, setIsPaid] = useState(initial?.isPaid ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const save = useSaveHoliday(initial?.id);
  const remove = useDeleteHoliday();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({ holidayDate, name, type, isPaid, notes: notes.trim() || null });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save holiday"));
    }
  }

  async function onDelete() {
    if (!initial) return;
    if (!confirm(`Delete ${initial.name} on ${initial.holidayDate}?`)) return;
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
      title={isNew ? "Add a holiday" : `Edit ${initial?.name}`}
      onClose={onClose}
      actions={
        <>
          {!isNew && (
            <button type="button" className="btn btn--danger" onClick={onDelete} style={{ marginRight: "auto" }}>
              Delete
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" form="holiday-edit" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <form id="holiday-edit" onSubmit={onSubmit} className="form-grid form-grid--2">
        <div className="field">
          <label className="field__label">Date *</label>
          <input className="input" type="date" value={holidayDate} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field__label">Name *</label>
          <input className="input" placeholder="Diwali" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label className="field__label">Type</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value as HolidayType)}>
            <option value="public">Public</option>
            <option value="school">School</option>
            <option value="optional">Optional</option>
            <option value="weekend">Weekend</option>
          </select>
        </div>
        <div className="field">
          <label className="field__label">Paid?</label>
          <label className="check">
            <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} />
            <span>Counts as a paid leave</span>
          </label>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field__label">Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
