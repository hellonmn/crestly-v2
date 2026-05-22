import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { useForm } from "react-hook-form";
import { PageHead } from "@/components/PageHead";
import { useSaveStudent, useStudent } from "./hooks";
import { getErrorMessage } from "@/lib/api";
import { StudentUpsertSchema, type StudentUpsert } from "@crestly/shared";

const blank: StudentUpsert = {
  studentName: "",
  fatherName: null,
  motherName: null,
  dob: null,
  age: null,
  gender: null,
  address: null,
  class: "",
  section: "",
  schoolName: null,
  board: null,
  fatherContact: null,
  motherContact: null,
  callingNumber: null,
  whatsappNumber: null,
  pickupPointId: null,
  familyId: null,
  status: "active",
};

/**
 * Student create / edit form. Sections are numbered the same way as in
 * erp/students/edit.php (Identity, Academic, Parents, Contact, ...).
 *
 * TODO Batch A.6:
 *  - Accommodation (Day Scholar / Hosteller toggle)
 *  - Sibling family picker + create-new flow
 *  - Pickup point picker (day scholars only)
 *  - Hostel section (room, guardian fields, hostellers only)
 *  - Auto fee allotment on create
 *  - Request-edit variant for non-admin roles
 */
export function StudentEditPage() {
  const { srNumber } = useParams<{ srNumber: string }>();
  const sr = srNumber ? Number(srNumber) : undefined;
  const isNew = sr === undefined;
  const navigate = useNavigate();

  const { data: existing, isLoading } = useStudent(sr);
  const save = useSaveStudent(sr);
  const form = useForm<StudentUpsert>({ defaultValues: blank });

  useEffect(() => {
    if (existing) form.reset(existing);
  }, [existing, form]);

  async function onSubmit(values: StudentUpsert) {
    const parsed = StudentUpsertSchema.safeParse(values);
    if (!parsed.success) {
      parsed.error.issues.forEach((i) =>
        form.setError(i.path[0] as keyof StudentUpsert, { message: i.message }),
      );
      return;
    }
    try {
      const saved = await save.mutateAsync(parsed.data);
      navigate(`/students/${saved.srNumber}`, { replace: true });
    } catch (err) {
      form.setError("root", { message: getErrorMessage(err, "Could not save student") });
    }
  }

  if (!isNew && isLoading) return <p className="muted">Loading…</p>;

  return (
    <>
      <PageHead
        group="STUDENTS"
        title={isNew ? "Add a new student" : `Edit · ${existing?.studentName ?? ""}`}
        actions={
          <Link to={isNew ? "/students" : `/students/${sr}`} className="btn btn--ghost btn--sm">
            <Icon name="chev-left" size={14} /> Back
          </Link>
        }
      />

      <form className="card" onSubmit={form.handleSubmit(onSubmit)}>
        <Section num="01" title="Identity">
          <div className="form-grid form-grid--2">
            {isNew && (
              <Field label="SR number (admission roll)" error={form.formState.errors.srNumber?.message}>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  {...form.register("srNumber", { valueAsNumber: true })}
                  required
                />
              </Field>
            )}
            <Field label="Student name" error={form.formState.errors.studentName?.message}>
              <input className="input" {...form.register("studentName")} required />
            </Field>
            <Field label="Date of birth">
              <input className="input" type="date" {...form.register("dob")} />
            </Field>
            <Field label="Gender">
              <select className="select" {...form.register("gender")}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Address" fullWidth>
              <textarea className="input input--area" {...form.register("address")} />
            </Field>
          </div>
        </Section>

        <Section num="02" title="Academic">
          <div className="form-grid form-grid--3">
            <Field label="Class"><input className="input" {...form.register("class")} required /></Field>
            <Field label="Section"><input className="input" {...form.register("section")} required /></Field>
            <Field label="Board"><input className="input" {...form.register("board")} /></Field>
            <Field label="Previous school"><input className="input" {...form.register("schoolName")} /></Field>
            <Field label="Status">
              <select className="select" {...form.register("status")}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </Field>
          </div>
        </Section>

        <Section num="03" title="Parents">
          <div className="form-grid form-grid--2">
            <Field label="Father name"><input className="input" {...form.register("fatherName")} /></Field>
            <Field label="Mother name"><input className="input" {...form.register("motherName")} /></Field>
          </div>
        </Section>

        <Section num="04" title="Contact">
          <div className="form-grid form-grid--2">
            <Field label="Father contact"><input className="input" {...form.register("fatherContact")} /></Field>
            <Field label="Mother contact"><input className="input" {...form.register("motherContact")} /></Field>
            <Field label="Calling number"><input className="input" {...form.register("callingNumber")} /></Field>
            <Field label="WhatsApp"><input className="input" {...form.register("whatsappNumber")} /></Field>
          </div>
        </Section>

        {form.formState.errors.root?.message && (
          <div className="banner banner--error" style={{ marginTop: 16 }}>
            <span>{form.formState.errors.root.message}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button type="button" className="btn btn--ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : isNew ? "Create student" : "Save changes"}
          </button>
        </div>
      </form>
    </>
  );
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="form-section">
      <div className="form-section__head">
        <span className="form-section__num">{num}</span>
        <span className="form-section__title">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  fullWidth,
  children,
}: {
  label: string;
  error?: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`field ${error ? "field--error" : ""}`} style={fullWidth ? { gridColumn: "1 / -1" } : undefined}>
      <label className="field__label">{label}</label>
      {children}
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}
