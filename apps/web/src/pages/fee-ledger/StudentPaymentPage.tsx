import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useRecordPayment, useStudentFee, useVoidPayment } from "./hooks";
import { getErrorMessage } from "@/lib/api";
import type { FeePaymentMethod } from "@crestly/shared";

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function today() { return new Date().toISOString().slice(0, 10); }

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000];

export function StudentPaymentPage() {
  const { srNumber } = useParams<{ srNumber: string }>();
  const sr = Number(srNumber);
  const { data, isLoading, error } = useStudentFee(sr);
  const record = useRecordPayment(sr);
  const voidPayment = useVoidPayment(sr);

  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [method, setMethod] = useState<FeePaymentMethod>("cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onRecord(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    const n = Number(amount);
    if (!n || n <= 0) {
      setErr("Enter a valid amount");
      return;
    }
    try {
      await record.mutateAsync({
        amount: n,
        paidOn,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      });
      setSuccess(`Payment of ${fmt(n)} recorded.`);
      setAmount("");
      setReference("");
      setNotes("");
    } catch (e) {
      setErr(getErrorMessage(e, "Could not record payment"));
    }
  }

  async function onVoid(paymentId: number) {
    const reason = window.prompt("Reason for voiding this receipt?");
    if (reason === null) return;
    try {
      await voidPayment.mutateAsync({ paymentId, reason: reason || undefined });
    } catch (e) {
      alert(getErrorMessage(e, "Could not void"));
    }
  }

  if (isLoading) return <p className="muted">Loading…</p>;
  if (error || !data) return <div className="banner banner--error"><span>Student fee record not found</span></div>;

  return (
    <>
      <PageHead
        group="FEE LEDGER"
        meta={`SR #${data.srNumber}`}
        title={data.studentName}
        lede={`${data.class}-${data.section} · ${data.sessionCode}`}
        actions={
          <>
            <Link to="/fee-ledger" className="btn btn--ghost btn--sm">
              <Icon name="chev-left" size={14} /> Back
            </Link>
            <Link to={`/students/${sr}`} className="btn btn--ghost btn--sm">
              <Icon name="users" size={14} /> Student
            </Link>
          </>
        }
      />

      {success && <div className="banner banner--success"><span>{success}</span></div>}
      {err && <div className="banner banner--error"><span>{err}</span></div>}

      <div className="grid grid--split grid--gap-lg">
        <div className="card">
          <div className="display-s" style={{ marginBottom: 16 }}>Record a payment</div>
          <form onSubmit={onRecord} className="form-grid form-grid--2">
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="field__label">Amount (₹) *</label>
              <input
                className="input mono"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
                required
                style={{ fontSize: 20 }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setAmount(String(q))}
                  >
                    {fmt(q)}
                  </button>
                ))}
                {data.dueAmount > 0 && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setAmount(String(data.dueAmount))}
                  >
                    Full due: {fmt(data.dueAmount)}
                  </button>
                )}
              </div>
            </div>
            <div className="field">
              <label className="field__label">Paid on *</label>
              <input className="input" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
            </div>
            <div className="field">
              <label className="field__label">Method *</label>
              <select className="select" value={method} onChange={(e) => setMethod(e.target.value as FeePaymentMethod)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="field__label">Reference (txn id, cheque no, …)</label>
              <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="field__label">Notes</label>
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn btn--primary" disabled={record.isPending}>
                {record.isPending ? "Saving…" : "Record payment"}
              </button>
            </div>
          </form>
        </div>

        <div className="card">
          <div className="display-s" style={{ marginBottom: 16 }}>Fee summary</div>
          <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4 }}>{fmt(data.dueAmount)}</div>
          <div className="muted" style={{ marginBottom: 16 }}>Outstanding · {data.paymentStatus.toUpperCase()}</div>
          <div className="detail-list">
            <Row k="Total this year" v={fmt(data.totalThisYear)} />
            <Row k="Paid" v={fmt(data.paidAmount)} />
            <Row k="Due" v={fmt(data.dueAmount)} />
            <Row k="Quarterly installment" v={fmt(data.quarterlyInstallment)} />
            <Row k="Monthly EMI" v={fmt(data.monthlyEmi)} />
            <Row k="Tuition (payable)" v={fmt(data.tuitionPayable)} />
            {data.siblingDiscountPct > 0 && (
              <Row k="Sibling discount" v={`${data.siblingDiscountPct}% · −${fmt(data.tuitionDiscount)}`} />
            )}
            <Row k="Annual charges" v={fmt(data.annualCharges)} />
            <Row k="Activity fee" v={fmt(data.activityFee)} />
            <Row k="Exam fee" v={fmt(data.examFee)} />
            <Row k="Transport" v={data.transportFee > 0 ? `${data.transportSlab ?? "—"} · ${fmt(data.transportFee)}` : "—"} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="display-s" style={{ marginBottom: 16 }}>Payment history</div>
        {data.payments.length === 0 ? (
          <p className="muted">No payments recorded.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((p) => (
                <tr key={p.id} style={p.isVoided ? { opacity: 0.5 } : undefined}>
                  <td className="mono">{p.receiptNo}</td>
                  <td className="mono">{p.paidOn}</td>
                  <td className="mono">{fmt(p.amount)}</td>
                  <td>{p.method}</td>
                  <td className="muted">{p.reference ?? "—"}</td>
                  <td className="muted">{p.notes ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    {p.isVoided ? (
                      <span className="pill pill--neutral">VOIDED</span>
                    ) : (
                      <button className="btn btn--ghost btn--sm" onClick={() => onVoid(p.id)}>
                        <Icon name="x" size={12} /> Void
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="detail-row">
      <div className="detail-row__k">{k}</div>
      <div className="detail-row__v">{v}</div>
    </div>
  );
}
