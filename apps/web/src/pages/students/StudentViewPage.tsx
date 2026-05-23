import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { Skeleton } from "@/components/Skeleton";
import { BrandDot } from "@/components/BrandDot";
import { useStudent } from "./hooks";
import { useAuth } from "@/lib/auth-store";
import type { Student } from "@crestly/shared";

type Tab = "bio" | "contact" | "fees" | "family";

function initials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "?";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1] ?? first;
  return ((first[0] ?? "") + (last[0] ?? "")).toUpperCase() || "?";
}

export function StudentViewPage() {
  const { srNumber } = useParams<{ srNumber: string }>();
  const sr = Number(srNumber);
  const { data, isLoading, error } = useStudent(sr);
  const { user } = useAuth();
  const canManage = (user?.permissions ?? []).includes("students.manage");
  const [tab, setTab] = useState<Tab>("bio");

  if (isLoading) {
    return (
      <>
        <PageHead group="STUDENTS" title="Loading…" />
        <div className="card"><Skeleton.Title width="60%" /><Skeleton.Text width="40%" style={{ marginTop: 8 }} /></div>
      </>
    );
  }
  if (error || !data) {
    return (
      <>
        <PageHead group="STUDENTS" title="Not found" />
        <div className="banner banner--error">
          <Icon name="alert" size={16} />
          <span>No student matches SR #{sr}. They may have been deleted or you may not have access.</span>
        </div>
        <Link to="/students" className="btn btn--ghost btn--sm" style={{ alignSelf: "flex-start" }}>
          <Icon name="chev-right" size={14} /> Back to list
        </Link>
      </>
    );
  }

  return (
    <>
      <PageHead
        group="STUDENTS"
        meta={`SR #${data.srNumber}`}
        title={data.studentName}
        lede={
          <>
            <span className="cls-pill" style={{ marginRight: 8 }}>{data.class}-{data.section}</span>
            <span className={`pill ${data.status === "active" ? "pill--success" : "pill--neutral"}`}>
              <span className="pill__dot" />{data.status}
            </span>
            {data.isHostel && (
              <span className="pill pill--info" style={{ marginLeft: 6 }}>HOSTEL</span>
            )}
            {data.familyId && (
              <span className="pill pill--neutral" style={{ marginLeft: 6 }}>SIB</span>
            )}
          </>
        }
        actions={
          <>
            <Link to="/students" className="btn btn--ghost btn--sm">
              <Icon name="chev-right" size={14} /> Back
            </Link>
            {canManage && (
              <Link to={`/students/${sr}/edit`} className="btn btn--primary btn--sm">
                <Icon name="edit" size={14} /> Edit
              </Link>
            )}
          </>
        }
      />

      {/* Hero card — name + avatar + quick meta */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: 16, padding: 18 }}>
        <div
          className="m-hero__avi"
          style={{ width: 64, height: 64, fontSize: 22 }}
        >
          {initials(data.studentName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="display-s" style={{ fontSize: 20, margin: 0 }}>
            {data.studentName}<BrandDot />
          </div>
          <div className="muted body-s" style={{ marginTop: 2 }}>
            {data.fatherName ? `S/o ${data.fatherName}` : "—"}
            {data.dob ? ` · DOB ${data.dob}` : ""}
            {data.gender ? ` · ${data.gender}` : ""}
          </div>
        </div>
        {data.pickupName && (
          <span className="pill pill--neutral" title="Pickup point">
            {data.pickupName}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="m-tabs" role="tablist" style={{ margin: 0, padding: 0 }}>
        {[
          ["bio", "Bio"], ["contact", "Contact"], ["fees", "Fees"], ["family", "Family"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`m-tab ${tab === key ? "is-active" : ""}`}
            onClick={() => setTab(key as Tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "bio" && <BioPanel s={data} />}
      {tab === "contact" && <ContactPanel s={data} />}
      {tab === "fees" && <FeesPanel s={data} />}
      {tab === "family" && <FamilyPanel s={data} />}
    </>
  );
}

function BioPanel({ s }: { s: Student }) {
  return (
    <div className="grid grid--split grid--gap-sm">
      <div className="card">
        <div className="display-s" style={{ marginBottom: 12, fontSize: 16 }}>Identity</div>
        <div className="detail-list">
          <Row label="Father" value={s.fatherName} />
          <Row label="Mother" value={s.motherName} />
          <Row label="Date of birth" value={s.dob} />
          <Row label="Age" value={s.age != null ? `${s.age} yrs` : null} />
          <Row label="Gender" value={s.gender} />
        </div>
      </div>
      <div className="card">
        <div className="display-s" style={{ marginBottom: 12, fontSize: 16 }}>School</div>
        <div className="detail-list">
          <Row label="Class · Section" value={`${s.class}-${s.section}`} />
          <Row label="Previous school" value={s.schoolName} />
          <Row label="Board" value={s.board} />
          <Row label="Status" value={s.status} />
          <Row label="Address" value={s.address} />
        </div>
      </div>
    </div>
  );
}

function ContactPanel({ s }: { s: Student }) {
  return (
    <div className="grid grid--split grid--gap-sm">
      <div className="card">
        <div className="display-s" style={{ marginBottom: 12, fontSize: 16 }}>Parent numbers</div>
        <div className="detail-list">
          <Row label="Father contact" value={s.fatherContact} mono />
          <Row label="Mother contact" value={s.motherContact} mono />
          <Row label="Calling number" value={s.callingNumber} mono />
          <Row label="WhatsApp" value={s.whatsappNumber} mono />
        </div>
      </div>
      <div className="card">
        <div className="display-s" style={{ marginBottom: 12, fontSize: 16 }}>Transport / pickup</div>
        <div className="detail-list">
          <Row label="Pickup point" value={s.pickupName} />
          <Row label="Address" value={s.address} />
        </div>
      </div>
    </div>
  );
}

function FeesPanel({ s }: { s: Student }) {
  return (
    <div className="card">
      <div className="display-s" style={{ marginBottom: 12, fontSize: 16 }}>Fees · current session</div>
      {s.paymentStatus == null ? (
        <div style={{ padding: "32px 12px", textAlign: "center" }}>
          <div className="label" style={{ marginBottom: 8 }}>NO FEE RECORD</div>
          <div className="muted body-s">
            This student doesn't have a fee record for the current session yet.
            {" "}
            <Link to="/fee-structure">Set up Fee Structure</Link> to generate one.
          </div>
        </div>
      ) : (
        <div className="detail-list">
          <Row
            label="Payment status"
            value={
              <span className={`pill ${
                s.paymentStatus === "paid" ? "pill--success"
                : s.paymentStatus === "partial" ? "pill--info"
                : s.paymentStatus === "overdue" ? "pill--error"
                : "pill--warn"
              }`}>
                <span className="pill__dot" />{s.paymentStatus}
              </span>
            }
          />
          <Row label="Outstanding due" value={s.dueAmount && s.dueAmount > 0 ? `₹${s.dueAmount.toLocaleString("en-IN")}` : "—"} mono />
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Link to={`/fee-ledger/${s.srNumber}`} className="btn btn--ghost btn--sm">
          <Icon name="ledger" size={14} /> Fee ledger
        </Link>
        <Link to={`/fee-ledger/${s.srNumber}/pay`} className="btn btn--primary btn--sm">
          <Icon name="rupee" size={14} /> Record payment
        </Link>
      </div>
    </div>
  );
}

function FamilyPanel({ s }: { s: Student }) {
  return (
    <div className="card">
      <div className="display-s" style={{ marginBottom: 12, fontSize: 16 }}>Family</div>
      {s.familyId == null ? (
        <div style={{ padding: "32px 12px", textAlign: "center" }}>
          <div className="label" style={{ marginBottom: 8 }}>NOT GROUPED</div>
          <div className="muted body-s">
            This student isn't grouped under a sibling family yet. Open the <Link to="/families">Families</Link> screen to link siblings.
          </div>
        </div>
      ) : (
        <div className="detail-list">
          <Row label="Family ID" value={`#${s.familyId}`} mono />
          <Row
            label="Open family"
            value={<Link to={`/families/${s.familyId}`}>View siblings →</Link>}
          />
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="detail-row">
      <div className="detail-row__k">{label}</div>
      <div className={`detail-row__v ${mono ? "mono" : ""}`}>{value ?? <span className="muted">—</span>}</div>
    </div>
  );
}
