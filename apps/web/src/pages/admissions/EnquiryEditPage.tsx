import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { useForm } from "react-hook-form";
import { PageHead } from "@/components/PageHead";
import { useEnquiry, useSaveEnquiry } from "./hooks";
import { getErrorMessage } from "@/lib/api";
import { EnquiryUpsertSchema, type EnquiryUpsertInput } from "@crestly/shared";

const blank: EnquiryUpsertInput = {
  childName: "",
  parentName: null,
  phone: "",
  email: null,
  classSeeking: null,
  source: "walk_in",
  sourceDetail: null,
  status: "new",
  followUpDate: null,
  assignedTo: null,
  city: null,
  notes: null,
};

export function EnquiryEditPage() {
  const { id } = useParams<{ id: string }>();
  const enquiryId = id ? Number(id) : undefined;
  const isNew = enquiryId === undefined;
  const navigate = useNavigate();
  const { data: existing, isLoading } = useEnquiry(enquiryId);
  const save = useSaveEnquiry(enquiryId);
  const form = useForm<EnquiryUpsertInput>({ defaultValues: blank });

  useEffect(() => {
    if (existing) {
      form.reset({
        childName: existing.childName,
        parentName: existing.parentName,
        phone: existing.phone,
        email: existing.email,
        classSeeking: existing.classSeeking,
        source: existing.source,
        sourceDetail: existing.sourceDetail,
        status: existing.status,
        followUpDate: existing.followUpDate,
        assignedTo: existing.assignedTo,
        city: existing.city,
        notes: existing.notes,
      });
    }
  }, [existing, form]);

  async function onSubmit(values: EnquiryUpsertInput) {
    const parsed = EnquiryUpsertSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((i) => form.setError(i.path[0] as keyof EnquiryUpsertInput, { message: i.message }));
      return;
    }
    try {
      const saved = await save.mutateAsync(parsed.data);
      navigate(`/admissions/${saved.id}`, { replace: true });
    } catch (err) {
      form.setError("root", { message: getErrorMessage(err, "Could not save enquiry") });
    }
  }

  if (!isNew && isLoading) return <p className="muted">Loading…</p>;

  return (
    <>
      <PageHead
        group="ADMISSION"
        title={isNew ? "New enquiry" : `Edit · ${existing?.childName ?? ""}`}
        actions={
          <Link to={isNew ? "/admissions" : `/admissions/${enquiryId}`} className="btn btn--ghost btn--sm">
            <Icon name="chev-left" size={14} /> Back
          </Link>
        }
      />

      <form className="card" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="form-grid form-grid--2">
          <Field label="Child name *"><input className="input" {...form.register("childName")} required /></Field>
          <Field label="Parent name"><input className="input" {...form.register("parentName")} /></Field>
          <Field label="Phone *"><input className="input mono" inputMode="tel" {...form.register("phone")} required /></Field>
          <Field label="Email"><input className="input" type="email" {...form.register("email")} /></Field>
          <Field label="Class seeking"><input className="input mono" {...form.register("classSeeking")} /></Field>
          <Field label="City"><input className="input" {...form.register("city")} /></Field>
          <Field label="Source">
            <select className="select" {...form.register("source")}>
              <option value="walk_in">Walk-in</option>
              <option value="phone">Phone</option>
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="social">Social</option>
              <option value="newspaper">Newspaper</option>
              <option value="hoarding">Hoarding</option>
              <option value="event">Event</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Source detail"><input className="input" {...form.register("sourceDetail")} /></Field>
          <Field label="Status">
            <select className="select" {...form.register("status")}>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="visit_scheduled">Visit scheduled</option>
              <option value="visited">Visited</option>
              <option value="application">Application</option>
              <option value="admitted">Admitted</option>
              <option value="lost">Lost</option>
            </select>
          </Field>
          <Field label="Follow-up date"><input className="input" type="date" {...form.register("followUpDate")} /></Field>
          <Field label="Notes" fullWidth>
            <textarea className="input input--area" {...form.register("notes")} />
          </Field>
        </div>

        {form.formState.errors.root?.message && (
          <div className="banner banner--error" style={{ marginTop: 16 }}>
            <span>{form.formState.errors.root.message}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : isNew ? "Create enquiry" : "Save changes"}
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
