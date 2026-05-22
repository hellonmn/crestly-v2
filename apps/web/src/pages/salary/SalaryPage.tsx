import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@crestly/icons";
import { api } from "@/lib/api";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { useAuth } from "@/lib/auth-store";
import type { SalaryResponse } from "@crestly/shared";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

export function SalaryPage() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const userId = Number(params.get("userId") ?? user?.id ?? 0);
  const [month, setMonth] = useState(params.get("month") ?? currentMonth());

  const { data, isLoading } = useQuery({
    queryKey: ["salary", userId, month],
    queryFn: async () => (await api.get<SalaryResponse>("/salary", { params: { userId, month } })).data,
    enabled: !!userId,
  });

  function shift(delta: number) {
    const [yr, mo] = month.split("-").map(Number);
    let y = yr!, m = mo! + delta;
    while (m < 1) { m += 12; y--; }
    while (m > 12) { m -= 12; y++; }
    setMonth(`${y}-${String(m).padStart(2, "0")}`);
  }

  const isSelf = userId === user?.id;
  const isAdmin = (user?.permissions ?? []).includes("hr.dashboard");

  return (
    <>
      <PageHead
        group="MY DAY"
        meta={month}
        title={isSelf ? "My Salary" : `Salary · ${data?.userName ?? `#${userId}`}`}
        lede={data ? `${data.daysMarked} days marked · ${fmt(data.dailyGross)} / day gross` : "Loading…"}
        actions={
          <>
            <button className="btn btn--ghost btn--sm" onClick={() => shift(-1)}>‹ Prev</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setMonth(currentMonth())}>This month</button>
            <button className="btn btn--ghost btn--sm" onClick={() => shift(1)}>Next ›</button>
            {!isSelf && isAdmin && (
              <Link to="/ledger/staff" className="btn btn--ghost btn--sm">
                <Icon name="chev-left" size={14} /> All staff
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mustard" icon="rupee" label="NET EARNED" value={data ? fmt(data.netEarned) : "—"} delta={data ? `of ${fmt(data.monthlySalary)} max` : ""} />
        <StatTile tint="rose" icon="alert" label="TOTAL CUT" value={data ? fmt(data.totalCut) : "—"} delta="late + early + absent" />
        <StatTile tint="mint" icon="check" label="PAID" value={data ? fmt(data.paidViaVoucher) : "—"} delta="via vouchers" />
        <StatTile tint="wheat" icon="info" label="DUE" value={data ? fmt(data.due) : "—"} delta={`${data?.pendingVouchers ?? 0} pending vouchers`} />
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>In</th>
              <th>Out</th>
              <th>Late</th>
              <th>Early</th>
              <th>Cut</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>}
            {data?.rows.map((r) => (
              <tr key={r.date} style={r.isHoliday || r.isWeekend ? { background: "var(--cream-soft)" } : undefined}>
                <td className="mono">{r.date}</td>
                <td>
                  {r.isHoliday ? <span className="pill pill--wheat">HOLIDAY</span>
                    : r.isWeekend ? <span className="pill pill--neutral">SUN</span>
                    : r.marked ? <span className="pill pill--success"><span className="pill__dot" />PRESENT</span>
                    : <span className="pill pill--error"><span className="pill__dot" />ABSENT</span>}
                </td>
                <td className="mono">{r.punchIn ?? "—"}</td>
                <td className="mono">{r.punchOut ?? "—"}</td>
                <td className="mono">{r.lateMinutes ? `${r.lateMinutes}m` : "—"}</td>
                <td className="mono">{r.earlyMinutes ? `${r.earlyMinutes}m` : "—"}</td>
                <td className="mono" style={{ color: r.cut > 0 ? "var(--error)" : "var(--ink-40)" }}>{r.cut ? fmt(r.cut) : "—"}</td>
                <td className="mono" style={{ fontWeight: 600 }}>{fmt(r.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
