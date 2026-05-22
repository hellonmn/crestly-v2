import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useAuth } from "@/lib/auth-store";
import { getErrorMessage } from "@/lib/api";
import {
  useCancelVoucher, useDecideVoucher, useMarkVoucherPaid, useVoucher,
} from "./hooks";
import type { VoucherPaymentMethod } from "@crestly/shared";

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

export function VoucherViewPage() {
  const { id } = useParams<{ id: string }>();
  const voucherId = Number(id);
  const { data, isLoading, error } = useVoucher(voucherId);
  const { user } = useAuth();
  const decide = useDecideVoucher(voucherId);
  const markPaid = useMarkVoucherPaid(voucherId);
  const cancel = useCancelVoucher(voucherId);

  const [remarks, setRemarks] = useState("");
  const [payMethod, setPayMethod] = useState<VoucherPaymentMethod>("bank_transfer");
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payRef, setPayRef] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (isLoading) return <p className="muted">Loading…</p>;
  if (error || !data) return <div className="banner banner--error"><span>Voucher not found</span></div>;

  const me = data.approvers.find((a) => a.approverUserId === user?.id);
  const canApprove = me && me.status === "pending" && data.status === "pending_approval";
  const canPay = data.status === "approved" && data.paymentStatus !== "paid" && user?.permissions.includes("vouchers.pay");
  const canCancel = data.createdBy === user?.id && data.paymentStatus !== "paid" && data.status !== "cancelled";
  const canEdit = data.createdBy === user?.id && data.status === "pending_approval";

  async function onDecide(decision: "approve" | "reject") {
    setErr(null);
    try {
      await decide.mutateAsync({ decision, remarks: remarks || null });
      setRemarks("");
    } catch (e) { setErr(getErrorMessage(e, "Decision failed")); }
  }

  async function onMarkPaid() {
    setErr(null);
    try {
      await markPaid.mutateAsync({
        paymentMethod: payMethod, paymentDate: payDate, paymentRef: payRef || null,
      });
      setPayRef("");
    } catch (e) { setErr(getErrorMessage(e, "Payment failed")); }
  }

  async function onCancel() {
    if (!confirm("Cancel this voucher?")) return;
    try { await cancel.mutateAsync(); }
    catch (e) { setErr(getErrorMessage(e, "Cancel failed")); }
  }

  return (
    <>
      <PageHead
        group="VOUCHERS"
        meta={data.voucherNo}
        title={data.title}
        lede={`${data.category ?? "Uncategorised"} · ${data.voucherDate} · by ${data.createdByName ?? "—"}`}
        actions={
          <>
            <Link to="/vouchers" className="btn btn--ghost btn--sm">
              <Icon name="chev-left" size={14} /> Back
            </Link>
            {canEdit && (
              <Link to={`/vouchers/${data.id}/edit`} className="btn btn--ghost btn--sm">
                <Icon name="edit" size={14} /> Edit
              </Link>
            )}
            {canCancel && (
              <button className="btn btn--danger btn--sm" onClick={onCancel}>Cancel voucher</button>
            )}
          </>
        }
      />

      {err && <div className="banner banner--error"><Icon name="alert" size={16} /><span>{err}</span></div>}

      <div className="grid grid--split grid--gap-lg">
        <div className="card">
          <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 4 }}>{fmt(data.amount)}</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <span className={`pill ${data.status === "approved" ? "pill--success" : data.status === "rejected" ? "pill--error" : "pill--warn"}`}>
              {data.status.replace("_", " ")}
            </span>
            <span className={`pill ${data.paymentStatus === "paid" ? "pill--success" : "pill--neutral"}`}>{data.paymentStatus}</span>
            {data.isCreditBill && <span className="pill pill--info">CREDIT</span>}
          </div>
          <div className="detail-list">
            <Row k="Vendor" v={data.vendorName ?? "—"} />
            <Row k="Vendor contact" v={data.vendorContact ?? "—"} />
            {data.salaryUserName && <Row k="Salary for" v={`${data.salaryUserName} (${data.salaryMonth ?? "—"})`} />}
            {data.description && <Row k="Description" v={data.description} />}
            {data.notes && <Row k="Notes" v={data.notes} />}
            {data.paymentDate && <Row k="Paid on" v={`${data.paymentDate} via ${data.paymentMethod}`} />}
            {data.paymentRef && <Row k="Payment ref" v={data.paymentRef} />}
          </div>
        </div>

        <div>
          <div className="card">
            <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Approvers</div>
            {data.approvers.length === 0 ? (
              <p className="muted">No approvers assigned.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.approvers.map((a) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`pill ${a.status === "approved" ? "pill--success" : a.status === "rejected" ? "pill--error" : "pill--warn"}`}>
                      <span className="pill__dot" />{a.status}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{a.approverName}</div>
                      {a.remarks && <div className="muted body-s">{a.remarks}</div>}
                    </div>
                    <span className="muted mono" style={{ fontSize: 11 }}>
                      {a.actionAt ? new Date(a.actionAt).toLocaleDateString("en-IN") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canApprove && (
            <div className="card">
              <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Your decision</div>
              <textarea
                className="input input--area"
                rows={2}
                placeholder="Remarks (optional)"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                style={{ marginBottom: 8 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn--success" onClick={() => onDecide("approve")} disabled={decide.isPending}>
                  <Icon name="check" size={14} /> Approve
                </button>
                <button className="btn btn--danger" onClick={() => onDecide("reject")} disabled={decide.isPending}>
                  <Icon name="x" size={14} /> Reject
                </button>
              </div>
            </div>
          )}

          {canPay && (
            <div className="card">
              <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Mark as paid</div>
              <div className="form-grid form-grid--2">
                <div className="field">
                  <label className="field__label">Method</label>
                  <select className="select" value={payMethod} onChange={(e) => setPayMethod(e.target.value as VoucherPaymentMethod)}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field__label">Date</label>
                  <input className="input" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="field__label">Reference</label>
                  <input className="input" value={payRef} onChange={(e) => setPayRef(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn--primary" onClick={onMarkPaid} disabled={markPaid.isPending}>
                  Save payment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="detail-row">
      <div className="detail-row__k">{k}</div>
      <div className="detail-row__v" style={{ whiteSpace: "pre-wrap" }}>{v}</div>
    </div>
  );
}
