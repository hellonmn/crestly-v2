import { Link, useParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useStudent } from "./hooks";
import { useAuth } from "@/lib/auth-store";

export function StudentViewPage() {
  const { srNumber } = useParams<{ srNumber: string }>();
  const sr = Number(srNumber);
  const { data, isLoading, error } = useStudent(sr);
  const { user } = useAuth();
  const canManage = (user?.permissions ?? []).includes("students.manage");

  if (isLoading) return <p className="muted">Loading…</p>;
  if (error || !data)
    return (
      <div className="banner banner--error">
        <span>Student not found</span>
      </div>
    );

  return (
    <>
      <PageHead
        group="STUDENTS"
        meta={`SR #${data.srNumber}`}
        title={data.studentName}
        lede={`${data.class}-${data.section} · ${data.status}`}
        actions={
          <>
            <Link to="/students" className="btn btn--ghost btn--sm">
              <Icon name="chev-left" size={14} /> Back
            </Link>
            {canManage && (
              <Link to={`/students/${sr}/edit`} className="btn btn--primary btn--sm">
                <Icon name="edit" size={14} /> Edit
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid--split grid--gap-lg">
        <div className="card">
          <div className="display-s" style={{ marginBottom: 16 }}>
            Identity
          </div>
          <div className="detail-list">
            <Row label="Father" value={data.fatherName} />
            <Row label="Mother" value={data.motherName} />
            <Row label="Date of birth" value={data.dob} />
            <Row label="Gender" value={data.gender} />
            <Row label="Board" value={data.board} />
            <Row label="Status" value={data.status} />
            <Row label="Address" value={data.address} />
          </div>
        </div>

        <div className="card">
          <div className="display-s" style={{ marginBottom: 16 }}>
            Contact
          </div>
          <div className="detail-list">
            <Row label="Father contact" value={data.fatherContact} />
            <Row label="Mother contact" value={data.motherContact} />
            <Row label="Calling number" value={data.callingNumber} />
            <Row label="WhatsApp" value={data.whatsappNumber} />
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="detail-row">
      <div className="detail-row__k">{label}</div>
      <div className="detail-row__v">{value ?? <span className="muted">—</span>}</div>
    </div>
  );
}
