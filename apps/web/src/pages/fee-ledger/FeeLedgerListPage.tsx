import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { useFeeLedger } from "./hooks";
import type { FeePaymentStatus } from "@crestly/shared";

const STATUS_PILL: Record<FeePaymentStatus, string> = {
  paid: "pill--success",
  partial: "pill--info",
  pending: "pill--warn",
  overdue: "pill--error",
};

function fmt(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function FeeLedgerListPage() {
  const [q, setQ] = useState("");
  const [classSlug, setClassSlug] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState<FeePaymentStatus | "">("");

  const { data, isLoading } = useFeeLedger({
    q: q || undefined,
    class: classSlug || undefined,
    section: section || undefined,
    status: status || undefined,
    pageSize: 200,
    page: 1,
  });

  const collected = data?.sessionPaid ?? 0;
  const total = data?.sessionTotal ?? 0;
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0;

  return (
    <>
      <PageHead
        group="FINANCE"
        title="Fee Ledger"
        lede={data ? `Showing ${data.items.length} of ${data.total.toLocaleString("en-IN")} students.` : "Loading…"}
        actions={
          <Link to="/fee-ledger/receipts" className="btn btn--ghost btn--sm">
            <Icon name="print" size={14} /> Receipts
          </Link>
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mint" icon="rupee" label="COLLECTED" value={fmt(collected)} delta="this session" />
        <StatTile tint="rose" icon="rupee" label="OUTSTANDING" value={fmt(data?.outstanding ?? 0)} delta="" />
        <StatTile tint="wheat" icon="alert" label="OVERDUE" value={String(data?.overdueCount ?? "—")} delta="students" />
        <StatTile tint="mustard" icon="check" label="FULLY PAID" value={String(data?.fullyPaidCount ?? "—")} delta="students" />
      </div>

      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div className="display-s">Session collection</div>
          <div className="mono">{pct}% · {fmt(collected)} / {fmt(total)}</div>
        </div>
        <div style={{ height: 8, background: "var(--cream-soft)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--success)" }} />
        </div>
      </div>

      <div className="toolbar card">
        <div className="search">
          <Icon name="search" size={14} />
          <input
            type="search"
            placeholder="Search by name or parent…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14 }}
          />
        </div>
        <input className="input mono" placeholder="Class" value={classSlug} onChange={(e) => setClassSlug(e.target.value)} style={{ maxWidth: 100 }} />
        <input className="input mono" placeholder="Section" value={section} onChange={(e) => setSection(e.target.value)} style={{ maxWidth: 100 }} />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as FeePaymentStatus | "")}>
          <option value="">All status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>SR #</th>
              <th>Student</th>
              <th>Class</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>
            )}
            {data?.items.map((s) => {
              const pctRow = s.totalThisYear > 0 ? Math.round((s.paidAmount / s.totalThisYear) * 100) : 0;
              return (
                <tr key={s.srNumber}>
                  <td className="td-sr mono">{s.srNumber}</td>
                  <td className="td-name">
                    <Link to={`/fee-ledger/student/${s.srNumber}`} style={{ textDecoration: "none", color: "inherit" }}>
                      {s.studentName}
                      {s.siblingDiscountPct > 0 && (
                        <span className="pill pill--info" style={{ marginLeft: 6, fontSize: 9 }}>
                          SIB {Number(s.siblingDiscountPct)}%
                        </span>
                      )}
                    </Link>
                    <div className="muted" style={{ fontSize: 11 }}>{s.fatherName ?? "—"}</div>
                  </td>
                  <td><span className="cls-pill">{s.class}-{s.section}</span></td>
                  <td className="mono">{fmt(s.totalThisYear)}</td>
                  <td className="mono">{fmt(s.paidAmount)}</td>
                  <td className="mono">{fmt(s.dueAmount)}</td>
                  <td>
                    <span className={`pill ${STATUS_PILL[s.paymentStatus]}`}>
                      <span className="pill__dot" />
                      {s.paymentStatus}
                    </span>
                    <div style={{ marginTop: 4, height: 4, width: 80, background: "var(--cream-soft)", borderRadius: 999 }}>
                      <div style={{ width: `${pctRow}%`, height: "100%", background: "var(--success)", borderRadius: 999 }} />
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Link to={`/fee-ledger/student/${s.srNumber}`} className="btn btn--primary btn--sm">
                      Pay / History
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
