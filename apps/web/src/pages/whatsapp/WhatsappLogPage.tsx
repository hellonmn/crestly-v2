import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useWaLog } from "./hooks";

export function WhatsappLogPage() {
  const { data, isLoading } = useWaLog();
  const [status, setStatus] = useState<"all" | "queued" | "sent" | "failed">("all");
  const [openId, setOpenId] = useState<number | null>(null);

  const filtered = (data ?? []).filter((e) => status === "all" || e.status === status);

  return (
    <>
      <PageHead
        group="SYSTEM"
        title="WhatsApp · Log"
        lede={data ? `Last ${data.length} send attempts` : "Loading…"}
        actions={
          <Link to="/settings/whatsapp" className="btn btn--ghost btn--sm">
            <Icon name="chev-left" size={14} /> Settings
          </Link>
        }
      />

      <div className="toolbar card">
        {(["all", "sent", "failed", "queued"] as const).map((s) => (
          <button key={s} className={`btn btn--sm ${status === s ? "btn--ink" : "btn--ghost"}`} onClick={() => setStatus(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Template</th>
              <th>To</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>}
            {filtered.map((e) => (
              <>
                <tr key={e.id} onClick={() => setOpenId(openId === e.id ? null : e.id)} style={{ cursor: "pointer" }}>
                  <td className="mono" style={{ fontSize: 11 }}>{new Date(e.createdAt).toLocaleString("en-IN")}</td>
                  <td className="mono">{e.actionKey ?? "—"}</td>
                  <td className="muted">{e.templateName ?? "—"}</td>
                  <td className="mono">{e.toPhone}</td>
                  <td>
                    <span className={`pill ${
                      e.status === "sent" ? "pill--success"
                        : e.status === "failed" ? "pill--error" : "pill--warn"
                    }`}>
                      <span className="pill__dot" />{e.status}
                    </span>
                  </td>
                  <td><Icon name={openId === e.id ? "chev-down" : "chev-right"} size={12} /></td>
                </tr>
                {openId === e.id && (
                  <tr>
                    <td colSpan={6} style={{ background: "var(--cream-soft)" }}>
                      <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                        {e.errorMessage && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <div className="label muted">ERROR</div>
                            <code className="mono" style={{ fontSize: 12 }}>{e.errorMessage}</code>
                          </div>
                        )}
                        {e.metaMessageId && (
                          <div>
                            <div className="label muted">META MESSAGE ID</div>
                            <code className="mono" style={{ fontSize: 11 }}>{e.metaMessageId}</code>
                          </div>
                        )}
                        <div style={{ gridColumn: "span 1" }}>
                          <div className="label muted">VARIABLES</div>
                          <pre className="mono" style={{ fontSize: 10, margin: 0 }}>{JSON.stringify(e.variables, null, 2)}</pre>
                        </div>
                        <div style={{ gridColumn: "span 2" }}>
                          <div className="label muted">CONTEXT</div>
                          <pre className="mono" style={{ fontSize: 10, margin: 0 }}>{JSON.stringify(e.context, null, 2)}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
