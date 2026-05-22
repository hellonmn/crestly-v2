import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useHostelSchedule } from "./hooks";

export function HostelSchedulePage() {
  const { data, isLoading } = useHostelSchedule();

  return (
    <>
      <PageHead
        group="HOSTEL"
        title="Schedule & Rules"
        lede="Weekday rhythm, lights-out, parent / outing windows, zero-tolerance policies."
        actions={
          <Link to="/hostel" className="btn btn--ghost btn--sm">
            <Icon name="chev-left" size={14} /> Back
          </Link>
        }
      />

      {isLoading && <p className="muted">Loading…</p>}

      {data && (
        <div className="grid grid--split grid--gap-lg">
          <div className="card">
            <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Weekday timeline</div>
            <div className="detail-list">
              {data.weekday.map((row, i) => (
                <div key={i} className="detail-row">
                  <div className="detail-row__k mono">{row.time}</div>
                  <div className="detail-row__v">{row.activity}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="card">
              <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Windows</div>
              <div className="detail-list">
                <div className="detail-row"><div className="detail-row__k">Lights out</div><div className="detail-row__v">{data.lightsOut}</div></div>
                <div className="detail-row"><div className="detail-row__k">Parent visit</div><div className="detail-row__v">{data.parentWindow}</div></div>
                <div className="detail-row"><div className="detail-row__k">Outings</div><div className="detail-row__v">{data.outingWindow}</div></div>
              </div>
            </div>

            <div className="card">
              <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Zero-tolerance policies</div>
              <ul style={{ paddingLeft: 20, lineHeight: 1.7, color: "var(--ink)" }}>
                {data.policies.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
