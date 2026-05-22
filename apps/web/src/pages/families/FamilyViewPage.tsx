import { Link, useParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useFamily } from "./hooks";
import { useAuth } from "@/lib/auth-store";

export function FamilyViewPage() {
  const { familyId } = useParams<{ familyId: string }>();
  const fid = Number(familyId);
  const { data, isLoading, error } = useFamily(fid);
  const { user } = useAuth();
  const canManage = (user?.permissions ?? []).includes("students.manage");

  if (isLoading) return <p className="muted">Loading…</p>;
  if (error || !data)
    return (
      <div className="banner banner--error">
        <span>Family not found</span>
      </div>
    );

  return (
    <>
      <PageHead
        group="FAMILIES"
        meta={`Family #${data.familyId}`}
        title={data.fatherName ?? "(no father name)"}
        lede={`${data.enrolledCount} child${data.enrolledCount === 1 ? "" : "ren"} enrolled · ₹${data.yearlyDiscountTotal.toLocaleString("en-IN")} discount this session`}
        actions={
          <>
            <Link to="/families" className="btn btn--ghost btn--sm">
              <Icon name="chev-left" size={14} /> Back
            </Link>
            {canManage && (
              <Link to={`/families/${data.familyId}/edit`} className="btn btn--primary btn--sm">
                <Icon name="edit" size={14} /> Edit
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid--split grid--gap-lg">
        <div className="card">
          <div className="display-s" style={{ marginBottom: 16 }}>Parents</div>
          <div className="detail-list">
            <Row label="Father" value={data.fatherName} />
            <Row label="Mother" value={data.motherName} />
            <Row label="Total siblings (declared)" value={data.siblingCount} />
            <Row label="Members note" value={data.membersText} />
          </div>
        </div>

        <div className="card">
          <div className="display-s" style={{ marginBottom: 16 }}>Discount this session</div>
          <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
            ₹{data.yearlyDiscountTotal.toLocaleString("en-IN")}
          </div>
          <p className="muted body-s">
            Computed from <code className="mono">student_fees.tuition_discount</code> across every enrolled sibling.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="display-s" style={{ marginBottom: 16 }}>Children</div>
        {data.members.length === 0 ? (
          <p className="muted">No children linked yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>SR #</th>
                <th>Name</th>
                <th>Class</th>
                <th>Date of birth</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.srNumber}>
                  <td className="td-sr mono">{m.srNumber}</td>
                  <td className="td-name">
                    <Link to={`/students/${m.srNumber}`} style={{ textDecoration: "none", color: "inherit" }}>
                      {m.studentName}
                    </Link>
                  </td>
                  <td><span className="cls-pill">{m.class}-{m.section}</span></td>
                  <td className="mono">{m.dob ?? "—"}</td>
                  <td>
                    <span className={`pill ${m.status === "active" ? "pill--success" : "pill--neutral"}`}>
                      <span className="pill__dot" />
                      {m.status}
                    </span>
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

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="detail-row">
      <div className="detail-row__k">{label}</div>
      <div className="detail-row__v">{value ?? <span className="muted">—</span>}</div>
    </div>
  );
}
