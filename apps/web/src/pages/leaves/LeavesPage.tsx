import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useAuth } from "@/lib/auth-store";
import { getErrorMessage } from "@/lib/api";
import { useCancelLeave, useDecideLeave, useLeaves } from "./hooks";
import type { LeaveStatus } from "@crestly/shared";

const STATUS_PILL: Record<LeaveStatus, string> = {
  pending: "pill--warn",
  approved: "pill--success",
  rejected: "pill--error",
  cancelled: "pill--neutral",
};

export function LeavesPage() {
  const { user } = useAuth();
  const isApprover = (user?.permissions ?? []).includes("leaves.approve");
  const canApply = (user?.permissions ?? []).includes("leaves.apply");

  const [scope, setScope] = useState<"mine" | "queue" | "all">(isApprover ? "queue" : "mine");
  const [status, setStatus] = useState<LeaveStatus | "">("");
  const { data, isLoading } = useLeaves({ scope, status: status || undefined });
  const decide = useDecideLeave();
  const cancelM = useCancelLeave();

  async function onDecide(id: number, decision: "approve" | "reject") {
    const note = decision === "reject"
      ? window.prompt("Reason for rejection (optional):") ?? ""
      : window.prompt("Decision note (optional):") ?? "";
    try { await decide.mutateAsync({ id, input: { decision, decisionNote: note || null } }); }
    catch (e) { alert(getErrorMessage(e, "Failed")); }
  }

  return (
    <>
      <PageHead
        group="HR"
        title="Leaves"
        lede={data ? `${data.pendingCount} pending in your view.` : "Loading…"}
        actions={
          canApply && (
            <Link to="/leaves/apply" className="btn btn--primary btn--sm">
              <Icon name="plus" size={14} /> Apply leave
            </Link>
          )
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        {data?.balances.map((b) => (
          <div key={b.leaveTypeId} className="stat-tile">
            <div className="stat-tile__icon icon-tint-wheat" style={{ minWidth: 40 }}>
              <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{b.shortCode}</span>
            </div>
            <div className="stat-tile__body">
              <div className="stat-tile__label">{b.leaveType}</div>
              <div className="stat-tile__value">{b.left}</div>
              <div className="stat-tile__delta">
                left · {b.taken} taken{b.pending > 0 ? ` · ${b.pending} pending` : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="toolbar card">
        <div style={{ display: "flex", gap: 4 }}>
          {isApprover && (
            <button className={`btn btn--sm ${scope === "queue" ? "btn--ink" : "btn--ghost"}`} onClick={() => setScope("queue")}>
              Queue {data?.pendingCount ? <span className="btn__count">{data.pendingCount}</span> : null}
            </button>
          )}
          <button className={`btn btn--sm ${scope === "mine" ? "btn--ink" : "btn--ghost"}`} onClick={() => setScope("mine")}>
            My leaves
          </button>
          {isApprover && (
            <button className={`btn btn--sm ${scope === "all" ? "btn--ink" : "btn--ghost"}`} onClick={() => setScope("all")}>
              All
            </button>
          )}
        </div>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as LeaveStatus | "")} style={{ marginLeft: "auto" }}>
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Staff</th>
              <th>From → To</th>
              <th>Days</th>
              <th>Reason</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>}
            {data?.items.map((l) => {
              const canDecide = isApprover && l.status === "pending" && scope !== "mine";
              const canCancel = scope === "mine" && l.status === "pending";
              return (
                <tr key={l.id}>
                  <td><span className="cls-pill">{l.leaveShortCode}</span></td>
                  <td className="td-name">{l.userName ?? "—"}</td>
                  <td className="mono">{l.fromDate}{l.fromDate !== l.toDate && ` → ${l.toDate}`}</td>
                  <td className="mono">{l.days}{l.halfDay !== "none" && ` (${l.halfDay.replace("_", " ")})`}</td>
                  <td className="muted body-s">{l.reason ?? "—"}</td>
                  <td>
                    <span className={`pill ${STATUS_PILL[l.status]}`}>
                      <span className="pill__dot" />{l.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {canDecide && (
                      <>
                        <button className="btn btn--success btn--sm" onClick={() => onDecide(l.id, "approve")}>Approve</button>
                        <button className="btn btn--danger btn--sm" style={{ marginLeft: 4 }} onClick={() => onDecide(l.id, "reject")}>Reject</button>
                      </>
                    )}
                    {canCancel && (
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={async () => {
                          if (!confirm("Cancel this leave?")) return;
                          try { await cancelM.mutateAsync(l.id); }
                          catch (e) { alert(getErrorMessage(e, "Failed")); }
                        }}
                      >
                        Cancel
                      </button>
                    )}
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
