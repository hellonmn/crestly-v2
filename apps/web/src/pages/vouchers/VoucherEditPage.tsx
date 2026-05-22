import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useSaveVoucher, useVoucher } from "./hooks";
import { useTeamList } from "@/pages/team/hooks";
import { getErrorMessage } from "@/lib/api";
import { VoucherCreateSchema, type VoucherCreateInput } from "@crestly/shared";

export function VoucherEditPage() {
  const { id } = useParams<{ id: string }>();
  const voucherId = id ? Number(id) : undefined;
  const isNew = voucherId === undefined;
  const navigate = useNavigate();
  const { data: existing, isLoading } = useVoucher(voucherId);
  const save = useSaveVoucher(voucherId);
  const { data: team } = useTeamList({ pageSize: 200, page: 1, status: "active" });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [vendorContact, setVendorContact] = useState("");
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().slice(0, 10));
  const [isCreditBill, setIsCreditBill] = useState(false);
  const [salaryUserId, setSalaryUserId] = useState<string>("");
  const [salaryMonth, setSalaryMonth] = useState("");
  const [notes, setNotes] = useState("");
  const [approverUserIds, setApproverUserIds] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description ?? "");
      setCategory(existing.category ?? "");
      setAmount(String(existing.amount));
      setVendorName(existing.vendorName ?? "");
      setVendorContact(existing.vendorContact ?? "");
      setVoucherDate(existing.voucherDate);
      setIsCreditBill(existing.isCreditBill);
      setSalaryUserId(existing.salaryUserId ? String(existing.salaryUserId) : "");
      setSalaryMonth(existing.salaryMonth ?? "");
      setNotes(existing.notes ?? "");
      setApproverUserIds(existing.approvers.map((a) => a.approverUserId));
    }
  }, [existing]);

  const approverCandidates = (team?.items ?? []).filter((m) =>
    m.roleSlug === "admin" || m.roleSlug === "principal" || m.roleSlug === "accountant"
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const input: VoucherCreateInput = {
      title,
      description: description.trim() || null,
      category: category.trim() || null,
      amount: Number(amount),
      vendorName: vendorName.trim() || null,
      vendorContact: vendorContact.trim() || null,
      salaryUserId: salaryUserId ? Number(salaryUserId) : null,
      salaryMonth: salaryMonth || null,
      voucherDate,
      isCreditBill,
      notes: notes.trim() || null,
      approverUserIds,
    };
    const parsed = VoucherCreateSchema.safeParse(input);
    if (!parsed.success) {
      setErr(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      return;
    }
    try {
      const saved = await save.mutateAsync(parsed.data);
      navigate(`/vouchers/${saved.id}`, { replace: true });
    } catch (e) {
      setErr(getErrorMessage(e, "Could not save voucher"));
    }
  }

  if (!isNew && isLoading) return <p className="muted">Loading…</p>;

  return (
    <>
      <PageHead
        group="VOUCHERS"
        title={isNew ? "New voucher" : `Edit · ${existing?.voucherNo}`}
        actions={
          <Link to={isNew ? "/vouchers" : `/vouchers/${voucherId}`} className="btn btn--ghost btn--sm">
            <Icon name="chev-left" size={14} /> Back
          </Link>
        }
      />

      <form className="card" onSubmit={onSubmit}>
        <div className="form-section">
          <div className="form-section__head"><span className="form-section__num">01</span><span className="form-section__title">Details</span></div>
          <div className="form-grid form-grid--2">
            <Field label="Title *" fullWidth><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
            <Field label="Amount (₹) *"><input className="input mono" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
            <Field label="Date *"><input className="input" type="date" value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} required /></Field>
            <Field label="Category"><input className="input" placeholder="Salary, Maintenance, Utilities…" value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
            <Field label="Salary for (staff)">
              <select className="select" value={salaryUserId} onChange={(e) => setSalaryUserId(e.target.value)}>
                <option value="">— not a salary voucher —</option>
                {(team?.items ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            {salaryUserId && (
              <Field label="Salary month (YYYY-MM)">
                <input className="input mono" placeholder="2025-04" value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value)} />
              </Field>
            )}
            <Field label="Description" fullWidth>
              <textarea className="input input--area" value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__head"><span className="form-section__num">02</span><span className="form-section__title">Vendor & payment plan</span></div>
          <div className="form-grid form-grid--2">
            <Field label="Vendor name"><input className="input" value={vendorName} onChange={(e) => setVendorName(e.target.value)} /></Field>
            <Field label="Vendor contact"><input className="input mono" value={vendorContact} onChange={(e) => setVendorContact(e.target.value)} /></Field>
            <Field label="Credit bill?" fullWidth>
              <label className="check">
                <input type="checkbox" checked={isCreditBill} onChange={(e) => setIsCreditBill(e.target.checked)} />
                Vendor will be paid later (credit)
              </label>
            </Field>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__head"><span className="form-section__num">03</span><span className="form-section__title">Approvers</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
            {approverCandidates.map((m) => (
              <label key={m.id} className="check">
                <input
                  type="checkbox"
                  checked={approverUserIds.includes(m.id)}
                  onChange={(e) =>
                    setApproverUserIds((prev) =>
                      e.target.checked ? [...prev, m.id] : prev.filter((x) => x !== m.id),
                    )
                  }
                />
                {m.name}
                <span className="muted body-s" style={{ marginLeft: 4 }}>{m.roleName}</span>
              </label>
            ))}
            {approverCandidates.length === 0 && <p className="muted">No eligible approvers found.</p>}
          </div>
        </div>

        <div className="form-section">
          <div className="form-section__head"><span className="form-section__num">04</span><span className="form-section__title">Internal notes</span></div>
          <textarea className="input input--area" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {err && <div className="banner banner--error"><span>{err}</span></div>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : isNew ? "Submit for approval" : "Save changes"}
          </button>
        </div>
      </form>
    </>
  );
}

function Field({ label, fullWidth, children }: { label: string; fullWidth?: boolean; children: React.ReactNode }) {
  return (
    <div className="field" style={fullWidth ? { gridColumn: "1 / -1" } : undefined}>
      <label className="field__label">{label}</label>
      {children}
    </div>
  );
}
