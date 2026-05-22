import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useEditRequest, useReviewRequest } from "./hooks";
import { useAuth } from "@/lib/auth-store";
import { getErrorMessage } from "@/lib/api";

type Decision = "approve" | "reject" | "";

export function ApprovalReviewPage() {
  const { id } = useParams<{ id: string }>();
  const requestId = Number(id);
  const { user } = useAuth();
  const isAdmin = user?.roleSlug === "admin";
  const { data, isLoading, error } = useEditRequest(requestId);
  const review = useReviewRequest(requestId);
  const navigate = useNavigate();

  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<number, string>>({});
  const [reviewNote, setReviewNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit() {
    setErr(null);
    const items = Object.entries(decisions).filter(([, d]) => d);
    if (items.length === 0) {
      setErr("Decide at least one field first.");
      return;
    }
    try {
      await review.mutateAsync({
        decisions: items.map(([fid, d]) => ({
          fieldId: Number(fid),
          decision: d as "approve" | "reject",
          rejectionReason: d === "reject" ? (rejectionReasons[Number(fid)] ?? null) : null,
        })),
        reviewNote: reviewNote.trim() || null,
      });
      navigate("/approvals");
    } catch (e) {
      setErr(getErrorMessage(e, "Failed to apply review"));
    }
  }

  if (isLoading) return <p className="muted">Loading…</p>;
  if (error || !data) return <div className="banner banner--error"><span>Request not found</span></div>;

  const readOnly = !isAdmin || data.status !== "pending";

  return (
    <>
      <PageHead
        group="APPROVALS"
        meta={`REQ #${data.id}`}
        title={`Review · ${data.studentName}`}
        lede={`Requested by ${data.requestedByName ?? "—"} · ${new Date(data.requestedAt).toLocaleString("en-IN")}`}
        actions={
          <Link to="/approvals" className="btn btn--ghost btn--sm">
            <Icon name="chev-left" size={14} /> Back
          </Link>
        }
      />

      {data.note && (
        <div className="banner banner--info">
          <Icon name="info" size={16} />
          <span><b>Requester's note:</b> {data.note}</span>
        </div>
      )}
      {data.reviewNote && (
        <div className="banner banner--info">
          <Icon name="info" size={16} />
          <span><b>Reviewer's note:</b> {data.reviewNote}</span>
        </div>
      )}
      {err && <div className="banner banner--error"><Icon name="alert" size={16} /><span>{err}</span></div>}

      <div className="grid grid--cols-1 grid--gap-sm">
        {data.fields.map((f) => {
          const d = decisions[f.id] ?? (f.fieldStatus === "approved" ? "approve" : f.fieldStatus === "rejected" ? "reject" : "");
          return (
            <div key={f.id} className="card">
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                <div className="display-s" style={{ fontSize: 16 }}>{f.fieldName}</div>
                <span className={`pill ${f.fieldStatus === "approved" ? "pill--success" : f.fieldStatus === "rejected" ? "pill--error" : "pill--warn"}`}>
                  {f.fieldStatus}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
                <div>
                  <div className="label" style={{ color: "var(--ink-40)", marginBottom: 4 }}>CURRENT</div>
                  <div style={{ padding: 8, background: "var(--cream-soft)", borderRadius: 6, fontSize: 13 }}>
                    {f.oldValue ?? <span className="muted">—</span>}
                  </div>
                </div>
                <div>
                  <div className="label" style={{ color: "var(--orange)", marginBottom: 4 }}>PROPOSED</div>
                  <div style={{ padding: 8, background: "var(--orange-tint)", borderRadius: 6, fontSize: 13 }}>
                    {f.newValue ?? <span className="muted">—</span>}
                  </div>
                </div>
              </div>
              {!readOnly && (
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <label className="check">
                    <input
                      type="radio"
                      name={`d-${f.id}`}
                      checked={d === "approve"}
                      onChange={() => setDecisions((p) => ({ ...p, [f.id]: "approve" }))}
                    />
                    Approve
                  </label>
                  <label className="check">
                    <input
                      type="radio"
                      name={`d-${f.id}`}
                      checked={d === "reject"}
                      onChange={() => setDecisions((p) => ({ ...p, [f.id]: "reject" }))}
                    />
                    Reject
                  </label>
                  {d === "reject" && (
                    <input
                      className="input input--sm"
                      placeholder="Reason for rejection"
                      value={rejectionReasons[f.id] ?? ""}
                      onChange={(e) => setRejectionReasons((p) => ({ ...p, [f.id]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                  )}
                </div>
              )}
              {f.rejectionReason && (
                <div className="muted body-s" style={{ marginTop: 8 }}>
                  Reason: {f.rejectionReason}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <div className="card">
          <div className="field">
            <label className="field__label">Reviewer's note (optional)</label>
            <textarea className="input input--area" rows={2} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
            <button className="btn btn--primary" onClick={onSubmit} disabled={review.isPending}>
              {review.isPending ? "Applying…" : "Apply decisions"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
