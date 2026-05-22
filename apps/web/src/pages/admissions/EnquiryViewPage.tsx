import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useAddFollowup, useEnquiry } from "./hooks";
import { getErrorMessage } from "@/lib/api";
import type { EnquiryStatus } from "@crestly/shared";

export function EnquiryViewPage() {
  const { id } = useParams<{ id: string }>();
  const enquiryId = Number(id);
  const { data, isLoading, error } = useEnquiry(enquiryId);
  const addFollowup = useAddFollowup(enquiryId);

  const [note, setNote] = useState("");
  const [statusTo, setStatusTo] = useState<EnquiryStatus | "">("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [lostReason, setLostReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await addFollowup.mutateAsync({
        note: note.trim() || null,
        statusTo: statusTo || null,
        nextFollowUp: nextFollowUp || null,
        lostReason: lostReason.trim() || null,
      });
      setNote("");
      setStatusTo("");
      setNextFollowUp("");
      setLostReason("");
    } catch (e) {
      setErr(getErrorMessage(e, "Failed to log follow-up"));
    }
  }

  if (isLoading) return <p className="muted">Loading…</p>;
  if (error || !data) return <div className="banner banner--error"><span>Enquiry not found</span></div>;

  return (
    <>
      <PageHead
        group="ADMISSION"
        meta={`ENQ #${data.id}`}
        title={data.childName}
        lede={`${data.parentName ?? "—"} · ${data.phone}`}
        actions={
          <>
            <Link to="/admissions" className="btn btn--ghost btn--sm">
              <Icon name="chev-left" size={14} /> Back
            </Link>
            <a href={`tel:+91${data.phone}`} className="btn btn--ghost btn--sm">
              <Icon name="msg" size={14} /> Call
            </a>
            <a href={`https://wa.me/91${data.phone}`} target="_blank" rel="noreferrer" className="btn btn--success btn--sm">
              <Icon name="msg" size={14} /> WhatsApp
            </a>
            <Link to={`/admissions/${data.id}/edit`} className="btn btn--primary btn--sm">
              <Icon name="edit" size={14} /> Edit
            </Link>
          </>
        }
      />

      <div className="grid grid--split grid--gap-lg">
        <div className="card">
          <div className="display-s" style={{ marginBottom: 16, fontSize: 18 }}>Details</div>
          <div className="detail-list">
            <Row k="Status" v={<span className="pill pill--info">{data.status.replace("_", " ")}</span>} />
            <Row k="Class seeking" v={data.classSeeking ?? "—"} />
            <Row k="Source" v={data.source} />
            <Row k="Source detail" v={data.sourceDetail ?? "—"} />
            <Row k="Email" v={data.email ?? "—"} />
            <Row k="City" v={data.city ?? "—"} />
            <Row k="Owner" v={data.assignedToName ?? "Unassigned"} />
            <Row k="Created by" v={data.createdByName ?? "—"} />
            <Row k="Follow-up" v={data.followUpDate ?? "—"} />
            <Row k="Lost reason" v={data.lostReason ?? "—"} />
            {data.notes && (
              <div className="detail-row">
                <div className="detail-row__k">Notes</div>
                <div className="detail-row__v" style={{ whiteSpace: "pre-wrap" }}>{data.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="display-s" style={{ marginBottom: 16, fontSize: 18 }}>Log a follow-up</div>
          <form onSubmit={onSubmit} className="form-grid form-grid--1" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="field">
              <label className="field__label">Note</label>
              <textarea className="input input--area" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="form-grid form-grid--2">
              <div className="field">
                <label className="field__label">Move status to</label>
                <select className="select" value={statusTo} onChange={(e) => setStatusTo(e.target.value as EnquiryStatus | "")}>
                  <option value="">— keep current —</option>
                  <option value="contacted">Contacted</option>
                  <option value="visit_scheduled">Visit scheduled</option>
                  <option value="visited">Visited</option>
                  <option value="application">Application</option>
                  <option value="admitted">Admitted</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div className="field">
                <label className="field__label">Next follow-up</label>
                <input className="input" type="date" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} />
              </div>
            </div>
            {statusTo === "lost" && (
              <div className="field">
                <label className="field__label">Lost reason</label>
                <input className="input" value={lostReason} onChange={(e) => setLostReason(e.target.value)} />
              </div>
            )}
            {err && <div className="banner banner--error"><span>{err}</span></div>}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn--primary" disabled={addFollowup.isPending}>
                {addFollowup.isPending ? "Saving…" : "Save follow-up"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="display-s" style={{ marginBottom: 16, fontSize: 18 }}>Timeline</div>
        {data.followups.length === 0 ? (
          <p className="muted">No follow-ups yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.followups.map((f) => (
              <div key={f.id} style={{ borderLeft: "2px solid var(--rule)", paddingLeft: 12 }}>
                <div className="muted mono" style={{ fontSize: 11 }}>
                  {new Date(f.createdAt).toLocaleString("en-IN")} · {f.createdByName ?? "—"}
                </div>
                {f.statusTo && (
                  <div style={{ marginTop: 4 }}>
                    <span className="pill pill--info">→ {f.statusTo.replace("_", " ")}</span>
                    {f.nextFollowUp && <span className="muted" style={{ marginLeft: 8 }}>next: {f.nextFollowUp}</span>}
                  </div>
                )}
                {f.note && <p style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{f.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="detail-row">
      <div className="detail-row__k">{k}</div>
      <div className="detail-row__v">{v}</div>
    </div>
  );
}
