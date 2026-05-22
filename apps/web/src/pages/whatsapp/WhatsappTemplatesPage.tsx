import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useRefreshTemplates, useUpsertBinding, useWaBindings, useWaTemplates } from "./hooks";
import { WA_ACTIONS } from "@crestly/shared";
import { getErrorMessage } from "@/lib/api";

export function WhatsappTemplatesPage() {
  const { data: templates } = useWaTemplates();
  const { data: bindings } = useWaBindings();
  const refresh = useRefreshTemplates();
  const upsert = useUpsertBinding();

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onRefresh() {
    setErr(null); setMsg(null);
    try {
      const r = await refresh.mutateAsync();
      setMsg(`Synced ${r.synced} templates from Meta.`);
    } catch (e) { setErr(getErrorMessage(e, "Refresh failed")); }
  }

  function bindingFor(actionKey: string) {
    return bindings?.find((b) => b.actionKey === actionKey);
  }

  return (
    <>
      <PageHead
        group="SYSTEM"
        title="WhatsApp · Templates &amp; bindings"
        lede="Sync templates from Meta. Bind each app action to a template + variable map."
        actions={
          <>
            <Link to="/settings/whatsapp" className="btn btn--ghost btn--sm">
              <Icon name="chev-left" size={14} /> Settings
            </Link>
            <button className="btn btn--primary btn--sm" onClick={onRefresh} disabled={refresh.isPending}>
              <Icon name="search" size={14} /> {refresh.isPending ? "Syncing…" : "Refresh from Meta"}
            </button>
          </>
        }
      />

      {msg && <div className="banner banner--success"><span>{msg}</span></div>}
      {err && <div className="banner banner--error"><span>{err}</span></div>}

      <div className="card">
        <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Synced templates</div>
        {templates && templates.length === 0 && <p className="muted">No templates yet. Hit "Refresh from Meta".</p>}
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Lang</th><th>Category</th><th>Status</th><th>Variables</th></tr>
          </thead>
          <tbody>
            {templates?.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.name}</td>
                <td>{t.language}</td>
                <td>{t.category ?? "—"}</td>
                <td>
                  <span className={`pill ${t.status === "APPROVED" ? "pill--success" : t.status === "REJECTED" ? "pill--error" : "pill--warn"}`}>
                    {t.status ?? "—"}
                  </span>
                </td>
                <td className="mono">{t.variableCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Action bindings</div>
        <p className="muted body-s" style={{ marginTop: 0 }}>
          Each row binds an app action to a synced template. The dispatcher reads these at send time.
        </p>
        {WA_ACTIONS.map((action) => (
          <BindingRow key={action} actionKey={action} binding={bindingFor(action)} templates={templates ?? []} onSave={upsert.mutateAsync} />
        ))}
      </div>
    </>
  );
}

function BindingRow({
  actionKey,
  binding,
  templates,
  onSave,
}: {
  actionKey: string;
  binding: ReturnType<typeof useWaBindings>["data"] extends Array<infer T> | undefined ? T | undefined : never;
  templates: NonNullable<ReturnType<typeof useWaTemplates>["data"]>;
  onSave: (input: { actionKey: string; templateName: string; templateLang: string; recipientField: string | null; variableMap: Record<string, unknown>; isEnabled: boolean }) => Promise<unknown>;
}) {
  const [templateName, setTemplateName] = useState(binding?.templateName ?? "");
  const [templateLang, setTemplateLang] = useState(binding?.templateLang ?? "en");
  const [recipientField, setRecipientField] = useState(binding?.recipientField ?? "phone");
  const [isEnabled, setIsEnabled] = useState(binding?.isEnabled ?? true);
  const [varMap, setVarMap] = useState(JSON.stringify(binding?.variableMap ?? {}, null, 0));
  const [busy, setBusy] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setSaveErr(null);
    try {
      const parsed = varMap.trim() === "" ? {} : JSON.parse(varMap);
      await onSave({
        actionKey,
        templateName,
        templateLang,
        recipientField: recipientField || null,
        variableMap: parsed,
        isEnabled,
      });
    } catch (e) { setSaveErr(getErrorMessage(e, "Save failed")); }
    finally { setBusy(false); }
  }

  return (
    <details style={{ borderTop: "1px solid var(--rule-soft)", padding: "12px 0" }}>
      <summary style={{ cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}>
        <span className="pill pill--wheat mono">{actionKey}</span>
        {binding ? (
          <span className="muted body-s">→ {binding.templateName} ({binding.templateLang})</span>
        ) : (
          <span className="muted body-s">not bound</span>
        )}
        {binding?.isEnabled === false && <span className="pill pill--error">DISABLED</span>}
      </summary>
      <div className="form-grid form-grid--2" style={{ marginTop: 12 }}>
        <div className="field">
          <label className="field__label">Template name *</label>
          <select className="select" value={templateName} onChange={(e) => setTemplateName(e.target.value)}>
            <option value="">— pick —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.name}>{t.name} · {t.language}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label">Template language</label>
          <input className="input mono" value={templateLang} onChange={(e) => setTemplateLang(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label">Recipient field</label>
          <input className="input mono" value={recipientField} onChange={(e) => setRecipientField(e.target.value)} placeholder="phone" />
          <span className="field__hint">Which key on the dispatch context holds the recipient's phone.</span>
        </div>
        <div className="field">
          <label className="field__label">Enabled</label>
          <label className="check">
            <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
            Send when this action fires
          </label>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label className="field__label">Variable map (JSON)</label>
          <textarea
            className="input input--area mono"
            rows={3}
            value={varMap}
            onChange={(e) => setVarMap(e.target.value)}
            placeholder={`{"1": {"field": "student_name"}, "2": {"field": "amount"}}`}
          />
        </div>
        {saveErr && (
          <div className="banner banner--error" style={{ gridColumn: "1 / -1" }}><span>{saveErr}</span></div>
        )}
        <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn--primary btn--sm" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save binding"}
          </button>
        </div>
      </div>
    </details>
  );
}
