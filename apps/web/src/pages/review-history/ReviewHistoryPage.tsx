import { useState } from "react";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { useReviewHistory } from "./hooks";

export function ReviewHistoryPage() {
  const [windowDays, setWindowDays] = useState(30);
  const { data, isLoading } = useReviewHistory(windowDays);
  const [openDate, setOpenDate] = useState<string | null>(null);

  return (
    <>
      <PageHead
        group="MY DAY"
        title="Review History"
        lede="Per-day completion of the dashboard review checklist."
        actions={
          <>
            {[7, 14, 30, 60, 90].map((w) => (
              <button
                key={w}
                className={`btn btn--sm ${w === windowDays ? "btn--ink" : "btn--ghost"}`}
                onClick={() => setWindowDays(w)}
              >
                {w} days
              </button>
            ))}
          </>
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mint" icon="check" label="LAST 7D" value={`${data?.avg7d ?? "—"}%`} delta="" />
        <StatTile tint="mustard" icon="check" label="LAST 30D" value={`${data?.avg30d ?? "—"}%`} delta="" />
        <StatTile tint="wheat" icon="features" label="FULL-REVIEW STREAK" value={String(data?.fullReviewStreak ?? "—")} delta="days" />
        <StatTile tint="sky" icon="info" label="ALL-TIME CHECKS" value={String(data?.allTimeChecks ?? "—")} delta="" />
      </div>

      {data && (
        <div className="card">
          <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Completion sparkline ({windowDays} days)</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
            {data.sparkline.map((p) => (
              <div
                key={p.date}
                title={`${p.date}: ${p.percent}%`}
                style={{
                  flex: 1,
                  height: `${p.percent}%`,
                  background: p.percent === 100 ? "var(--success)" : p.percent > 50 ? "var(--tint-mint-deep)" : p.percent > 0 ? "var(--warn)" : "var(--cream-deep)",
                  borderRadius: 2,
                  minHeight: 2,
                }}
              />
            ))}
          </div>
          <div className="muted body-s" style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span>{data.sparkline[0]?.date}</span>
            <span>today</span>
          </div>
        </div>
      )}

      {!isLoading && data && (
        <div className="card" style={{ padding: 0 }}>
          {data.days.map((d) => {
            const pct = d.total > 0 ? Math.round((d.reviewed.length / d.total) * 100) : 0;
            const open = openDate === d.reviewDate;
            return (
              <div key={d.reviewDate} style={{ borderBottom: "1px solid var(--rule-soft)" }}>
                <button
                  onClick={() => setOpenDate(open ? null : d.reviewDate)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: 16, border: 0, background: "transparent", cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div className="mono" style={{ minWidth: 110 }}>{d.reviewDate}</div>
                    <div style={{ flex: 1, height: 6, background: "var(--cream-soft)", borderRadius: 999 }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--success)", borderRadius: 999 }} />
                    </div>
                    <div className="mono" style={{ minWidth: 60, textAlign: "right" }}>{pct}%</div>
                    <div className="muted body-s" style={{ minWidth: 80, textAlign: "right" }}>
                      {d.reviewed.length} / {d.total}
                    </div>
                  </div>
                </button>
                {open && (
                  <div style={{ padding: "0 16px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div className="label" style={{ marginBottom: 4, color: "var(--ink-40)" }}>REVIEWED</div>
                      {d.reviewed.length === 0 && <p className="muted body-s">—</p>}
                      {d.reviewed.map((r) => (
                        <div key={r.key} style={{ fontSize: 12 }}>
                          ✓ {r.label ?? r.key}{" "}
                          <span className="muted mono" style={{ fontSize: 10 }}>
                            {new Date(r.reviewedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="label" style={{ marginBottom: 4, color: "var(--ink-40)" }}>PENDING</div>
                      {d.pending.length === 0 && <p className="muted body-s">—</p>}
                      {d.pending.map((p) => (
                        <div key={p.key} style={{ fontSize: 12 }} className="muted">○ {p.label ?? p.key}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
