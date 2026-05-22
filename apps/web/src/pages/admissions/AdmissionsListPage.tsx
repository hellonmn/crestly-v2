import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { useEnquiries } from "./hooks";
import type { EnquirySource, EnquiryStatus } from "@crestly/shared";

const STATUS_PILL: Record<EnquiryStatus, string> = {
  new: "pill--info",
  contacted: "pill--wheat",
  visit_scheduled: "pill--wheat",
  visited: "pill--wheat",
  application: "pill--mint",
  admitted: "pill--success",
  lost: "pill--error",
};

export function AdmissionsListPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<EnquiryStatus | "">("");
  const [source, setSource] = useState<EnquirySource | "">("");
  const [followupsDue, setFollowupsDue] = useState(false);

  const { data, isLoading } = useEnquiries({
    q: q || undefined,
    status: status || undefined,
    source: source || undefined,
    followupsDue: followupsDue || undefined,
    page: 1,
    pageSize: 100,
  });

  return (
    <>
      <PageHead
        group="ADMISSION"
        title="Enquiries"
        lede={data ? `${data.totals.all.toLocaleString("en-IN")} enquiries · ${data.totals.followupsDue} follow-ups due` : "Loading…"}
        actions={
          <Link to="/admissions/new" className="btn btn--primary btn--sm">
            <Icon name="plus" size={14} /> New enquiry
          </Link>
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mustard" icon="admissions" label="TOTAL" value={String(data?.totals.all ?? "—")} delta="" />
        <StatTile tint="mint" icon="check" label="ADMITTED" value={String(data?.totals.admitted ?? "—")} delta="" />
        <StatTile tint="rose" icon="x" label="LOST" value={String(data?.totals.lost ?? "—")} delta="" />
        <StatTile tint="wheat" icon="alert" label="FOLLOW-UPS DUE" value={String(data?.totals.followupsDue ?? "—")} delta="today or earlier" />
      </div>

      <div className="toolbar card">
        <div className="search">
          <Icon name="search" size={14} />
          <input
            type="search"
            placeholder="Search by child, parent or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14 }}
          />
        </div>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as EnquiryStatus | "")}>
          <option value="">All status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="visit_scheduled">Visit scheduled</option>
          <option value="visited">Visited</option>
          <option value="application">Application</option>
          <option value="admitted">Admitted</option>
          <option value="lost">Lost</option>
        </select>
        <select className="select" value={source} onChange={(e) => setSource(e.target.value as EnquirySource | "")}>
          <option value="">All sources</option>
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
        <label className="check">
          <input type="checkbox" checked={followupsDue} onChange={(e) => setFollowupsDue(e.target.checked)} />
          Follow-ups due
        </label>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>ENQ #</th>
              <th>Child / Parent</th>
              <th>Phone</th>
              <th>Class</th>
              <th>Source</th>
              <th>Status</th>
              <th>Follow-up</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>}
            {data?.items.map((e) => (
              <tr key={e.id}>
                <td className="td-sr mono">{e.id}</td>
                <td className="td-name">
                  <Link to={`/admissions/${e.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    {e.childName}
                  </Link>
                  <div className="muted body-s">{e.parentName ?? "—"}</div>
                </td>
                <td className="mono">{e.phone}</td>
                <td>{e.classSeeking ? <span className="cls-pill">{e.classSeeking}</span> : <span className="muted">—</span>}</td>
                <td><span className="pill pill--wheat">{e.source.replace("_", " ")}</span></td>
                <td>
                  <span className={`pill ${STATUS_PILL[e.status]}`}>
                    <span className="pill__dot" />
                    {e.status.replace("_", " ")}
                  </span>
                </td>
                <td className="mono">{e.followUpDate ?? <span className="muted">—</span>}</td>
                <td className="muted">{e.assignedToName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
