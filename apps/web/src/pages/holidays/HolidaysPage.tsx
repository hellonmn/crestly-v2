import { useMemo, useState } from "react";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { QueryError } from "@/components/QueryError";
import { StatTile } from "@/components/StatTile";
import { Skeleton } from "@/components/Skeleton";
import { Modal } from "@/components/Modal";
import {
  useDeleteHoliday,
  useHolidayCalendar,
  useSaveHoliday,
} from "./hooks";
import { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import type { Holiday, HolidayType } from "@crestly/shared";

/* ============================================================
   Holidays calendar — ports erp/holidays/index.php verbatim.
   Academic year runs April → March. Stat tiles, AY picker,
   12-month grid (Apr..Dec of year + Jan..Mar of year+1) with
   per-month cards listing every holiday with its date chip,
   day-of-week, type pill, and an inline delete (admin only).
   ============================================================ */

const MONTHS_FULL = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function pickerYears(currentAY: number): number[] {
  return [currentAY - 1, currentAY, currentAY + 1, currentAY + 2];
}

function defaultAY(): number {
  const today = new Date();
  return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
}

function fmtDayChip(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(d);
}
function dowName(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return DAY_NAMES[d.getDay()] ?? "";
}

const TYPE_LABEL: Record<HolidayType, string> = {
  public:   "Public (Gazetted)",
  school:   "School-specific",
  optional: "Optional",
  weekend:  "Weekend",
};

function typePillClass(t: HolidayType): string {
  switch (t) {
    case "public":   return "pill--success";
    case "school":   return "pill--info";
    case "optional": return "pill--wheat";
    case "weekend":  return "pill--neutral";
  }
}

export function HolidaysPage() {
  const { user } = useAuth();
  const canManage = (user?.permissions ?? []).includes("holidays.manage");

  const fallbackAY = useMemo(() => defaultAY(), []);
  const [academicYear, setAcademicYear] = useState<number>(fallbackAY);
  const { data, isLoading, error, refetch, isFetching } = useHolidayCalendar(academicYear);
  const [editing, setEditing] = useState<Holiday | "new" | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const currentAY = data?.academicYear ?? academicYear;
  const ayLabel = `${currentAY}–${String(currentAY + 1).slice(-2)}`;

  // Build the Apr..Dec + Jan..Mar walk identical to PHP.
  const byMonth = useMemo(() => {
    const months: { year: number; month: number; label: string; items: Holiday[] }[] = [];
    for (let m = 4; m <= 12; m++) months.push({ year: currentAY,     month: m, label: `${MONTHS_FULL[m - 1]} ${currentAY}`,     items: [] });
    for (let m = 1; m <= 3;  m++) months.push({ year: currentAY + 1, month: m, label: `${MONTHS_FULL[m - 1]} ${currentAY + 1}`, items: [] });
    if (data) {
      for (const h of data.items) {
        const [y, m] = h.holidayDate.split("-").map(Number);
        const idx = months.findIndex((b) => b.year === y && b.month === m);
        if (idx >= 0) months[idx]!.items.push(h);
      }
    }
    return months;
  }, [data, currentAY]);

  function notifySaved(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 3000);
  }

  return (
    <>
      <PageHead
        group="HR"
        meta={`AY ${ayLabel}`}
        title={`Holidays · AY ${ayLabel}`}
        lede={
          <>
            Academic year runs <b>April {currentAY} – March {currentAY + 1}</b>.
            School-wide closure days listed below — approved leaves on these dates don't count
            against staff balance, and salary still pays. Sundays are auto-handled, no need to add them.
          </>
        }
        actions={
          <>
            <select
              className="select"
              value={academicYear}
              onChange={(e) => setAcademicYear(Number(e.target.value))}
            >
              {pickerYears(fallbackAY).map((y) => (
                <option key={y} value={y}>
                  AY {y}–{String(y + 1).slice(-2)} · Apr {y} – Mar {y + 1}
                </option>
              ))}
            </select>
            {canManage && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setEditing("new")}
              >
                <Icon name="plus" size={14} /> Add holiday
              </button>
            )}
          </>
        }
      />

      {flash && (
        <div className="banner banner--success">
          <Icon name="check" size={16} /><span>{flash}</span>
        </div>
      )}

      <QueryError error={error} refetch={refetch} isFetching={isFetching} label="holidays" />

      {/* Stat tiles — match PHP order: Total / Upcoming 60d / Sundays / Working days */}
      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile
          tint="mint"
          icon="holidays"
          label="TOTAL HOLIDAYS"
          value={String(data?.totalHolidays ?? "—")}
          delta={`in AY ${ayLabel}`}
        />
        <StatTile
          tint="mustard"
          icon="clock"
          label="UPCOMING · 60 DAYS"
          value={String(data?.upcomingIn60Days ?? "—")}
          delta="from today"
        />
        <StatTile
          tint="sky"
          icon="calendar"
          label="SUNDAYS"
          value={String(data?.sundayCount ?? "—")}
          delta="auto-counted as paid off"
        />
        <StatTile
          tint="wheat"
          icon="calendar"
          label="WORKING DAYS"
          value={String(data?.workingDays ?? "—")}
          delta="non-Sunday, non-holiday"
        />
      </div>

      {isLoading ? (
        <div className="card" style={{ marginTop: 18 }}>
          <Skeleton.Title width="30%" />
        </div>
      ) : (
        <div className="grid grid--cols-3 grid--gap-md" style={{ marginTop: 18 }}>
          {byMonth.map((m) => (
            <MonthCard
              key={`${m.year}-${m.month}`}
              label={m.label}
              items={m.items}
              canManage={canManage}
              onEdit={(h) => setEditing(h)}
              onDeleted={() => notifySaved("Holiday deleted.")}
            />
          ))}
        </div>
      )}

      {editing && (
        <HolidayEditModal
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(action) =>
            notifySaved(action === "deleted" ? "Holiday deleted." : "Holiday saved.")
          }
        />
      )}

      <style>{HOL_CSS}</style>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Month card                                                          */
/* ------------------------------------------------------------------ */

function MonthCard({
  label, items, canManage, onEdit, onDeleted,
}: {
  label: string;
  items: Holiday[];
  canManage: boolean;
  onEdit: (h: Holiday) => void;
  onDeleted: () => void;
}) {
  const remove = useDeleteHoliday();

  async function onDelete(h: Holiday) {
    if (!confirm(`Delete "${h.name}" on ${h.holidayDate}?`)) return;
    try {
      await remove.mutateAsync(h.id);
      onDeleted();
    } catch {
      // Swallow — the modal version surfaces errors; here it's a tiny inline action.
    }
  }

  return (
    <div className="card hol-month">
      <div className="hol-month__head">
        <h3 className="hol-month__title">{label}</h3>
        <span className="muted body-s">
          {items.length} holiday{items.length === 1 ? "" : "s"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="hol-month__empty muted body-s">No holidays</div>
      ) : (
        items.map((h) => (
          <div key={h.id} className="hol-row">
            <div className="hol-row__date">{fmtDayChip(h.holidayDate)}</div>
            <div className="hol-row__body">
              <div className="hol-row__name">{h.name}</div>
              <div className="muted body-s hol-row__sub">
                <span className={`pill ${typePillClass(h.type)}`} style={{ fontSize: 9.5, padding: "1px 7px" }}>
                  {h.type.toUpperCase()}
                </span>
                <span>· {h.isPaid ? "Paid" : "Unpaid"}</span>
                <span>· {dowName(h.holidayDate)}</span>
              </div>
            </div>
            {canManage && (
              <div className="hol-row__actions">
                <button
                  type="button"
                  className="icon-btn"
                  title="Edit"
                  aria-label="Edit"
                  onClick={() => onEdit(h)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4v16h16v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Delete"
                  aria-label="Delete"
                  onClick={() => onDelete(h)}
                  disabled={remove.isPending}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add / edit modal                                                    */
/* ------------------------------------------------------------------ */

function HolidayEditModal({
  initial, onClose, onSaved,
}: {
  initial: Holiday | null;
  onClose: () => void;
  onSaved: (action: "saved" | "deleted") => void;
}) {
  const isNew = !initial;
  const [holidayDate, setDate] = useState(initial?.holidayDate ?? new Date().toISOString().slice(0, 10));
  const [name, setName]   = useState(initial?.name ?? "");
  const [type, setType]   = useState<HolidayType>(initial?.type ?? "public");
  const [isPaid, setIsPaid] = useState(initial?.isPaid ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const save   = useSaveHoliday(initial?.id);
  const remove = useDeleteHoliday();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await save.mutateAsync({
        holidayDate,
        name: name.trim(),
        type,
        isPaid,
        notes: notes.trim() || null,
      });
      onSaved("saved");
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save holiday"));
    }
  }

  async function onDelete() {
    if (!initial) return;
    if (!confirm(`Delete "${initial.name}" on ${initial.holidayDate}?`)) return;
    try {
      await remove.mutateAsync(initial.id);
      onSaved("deleted");
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete"));
    }
  }

  return (
    <Modal
      open
      title={isNew ? "Add holiday" : `Edit ${initial?.name}`}
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
            {save.isPending ? "Saving…" : "Save holiday"}
          </button>
        </>
      }
    >
      <form id="holiday-edit" onSubmit={onSubmit} className="form-grid form-grid--2">
        <div className="field span-2">
          <label className="field__label field__label--req" htmlFor="hd-date">Date</label>
          <input
            id="hd-date"
            className="input"
            type="date"
            value={holidayDate}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="field span-2">
          <label className="field__label field__label--req" htmlFor="hd-name">Name</label>
          <input
            id="hd-name"
            className="input"
            placeholder="Diwali"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="hd-type">Type</label>
          <select
            id="hd-type"
            className="select"
            value={type}
            onChange={(e) => setType(e.target.value as HolidayType)}
          >
            {(Object.keys(TYPE_LABEL) as HolidayType[]).map((k) => (
              <option key={k} value={k}>{TYPE_LABEL[k]}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="hd-paid">Paid?</label>
          <select
            id="hd-paid"
            className="select"
            value={isPaid ? "1" : "0"}
            onChange={(e) => setIsPaid(e.target.value === "1")}
          >
            <option value="1">Paid</option>
            <option value="0">Unpaid</option>
          </select>
        </div>
        <div className="field span-2">
          <label className="field__label" htmlFor="hd-notes">Notes (optional)</label>
          <input
            id="hd-notes"
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={255}
          />
        </div>
        {error && (
          <div className="banner banner--error" style={{ gridColumn: "1 / -1" }}>
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}

const HOL_CSS = `
  .hol-month { padding: 16px; }
  .hol-month__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .hol-month__title {
    font-size: 14px;
    margin: 0;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink);
    font-weight: 700;
  }
  .hol-month__empty {
    padding: 14px 0;
    text-align: center;
    border-top: 1px dashed var(--rule-soft);
  }
  .hol-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-top: 1px dashed var(--rule-soft);
  }
  .hol-row__date {
    background: var(--orange-tint, rgba(242, 92, 25, 0.12));
    color: var(--orange-deep, #B8410B);
    border-radius: 8px;
    padding: 4px 8px;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    min-width: 48px;
    text-align: center;
    white-space: nowrap;
  }
  .hol-row__body { flex: 1; min-width: 0; }
  .hol-row__name {
    font-weight: 600;
    font-size: 13px;
    color: var(--ink);
  }
  .hol-row__sub {
    font-size: 11px;
    margin-top: 2px;
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
  }
  .hol-row__actions {
    display: flex;
    gap: 2px;
  }

  .icon-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px;
    border-radius: 6px;
    color: var(--ink-60);
    background: transparent;
    border: 0;
    cursor: pointer;
    transition: background 120ms ease, color 120ms ease;
  }
  .icon-btn:hover { background: var(--cream-soft); color: var(--ink); }
  .icon-btn:disabled { opacity: 0.5; cursor: wait; }
`;
