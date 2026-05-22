import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useSaveWaSettings, useWaSettings, useWaTest } from "./hooks";
import { getErrorMessage } from "@/lib/api";

export function WhatsappSettingsPage() {
  const { data, isLoading } = useWaSettings();
  const save = useSaveWaSettings();
  const test = useWaTest();

  const [form, setForm] = useState({
    enabled: false,
    accessToken: "",
    phoneNumberId: "",
    wabaId: "",
    apiVersion: "v22.0",
    displayNumber: "",
    defaultCountry: "91",
  });
  const [testPhone, setTestPhone] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        enabled: data.enabled,
        accessToken: data.accessToken ?? "",
        phoneNumberId: data.phoneNumberId ?? "",
        wabaId: data.wabaId ?? "",
        apiVersion: data.apiVersion,
        displayNumber: data.displayNumber ?? "",
        defaultCountry: data.defaultCountry,
      });
    }
  }, [data]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    try {
      // Skip the token if it's still the masked value.
      const patch: typeof form = { ...form };
      if (patch.accessToken.startsWith("****")) patch.accessToken = "";
      await save.mutateAsync(patch);
      setSuccess("Settings saved.");
    } catch (e) { setErr(getErrorMessage(e, "Failed")); }
  }

  async function onTest() {
    setErr(null);
    setSuccess(null);
    if (!testPhone) { setErr("Enter a phone number first."); return; }
    try {
      const r = await test.mutateAsync(testPhone);
      if (r.ok) setSuccess(`Sent. Check Meta logs for delivery.`);
      else setErr(r.error ?? "Test failed.");
    } catch (e) { setErr(getErrorMessage(e, "Test failed")); }
  }

  if (isLoading) return <p className="muted">Loading…</p>;

  return (
    <>
      <PageHead
        group="SYSTEM"
        title="WhatsApp · Settings"
        lede="Meta Cloud API credentials. Disable to suspend all outbound messages."
        actions={
          <>
            <Link to="/settings/whatsapp/templates" className="btn btn--ghost btn--sm">Templates</Link>
            <Link to="/settings/whatsapp/log" className="btn btn--ghost btn--sm">Log</Link>
          </>
        }
      />

      {success && <div className="banner banner--success"><Icon name="check" size={16} /><span>{success}</span></div>}
      {err && <div className="banner banner--error"><Icon name="alert" size={16} /><span>{err}</span></div>}

      <form className="card" onSubmit={onSubmit}>
        <div className="form-section">
          <div className="form-section__head"><span className="form-section__num">01</span><span className="form-section__title">Credentials</span></div>
          <div className="form-grid form-grid--2">
            <Field label="Access token (Meta)" fullWidth>
              <input className="input mono" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} placeholder={data?.accessToken ?? ""} />
              <span className="field__hint">Leave the masked value to keep the existing token.</span>
            </Field>
            <Field label="Phone Number ID">
              <input className="input mono" value={form.phoneNumberId} onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })} />
            </Field>
            <Field label="WABA ID">
              <input className="input mono" value={form.wabaId} onChange={(e) => setForm({ ...form, wabaId: e.target.value })} />
            </Field>
            <Field label="API version">
              <input className="input mono" value={form.apiVersion} onChange={(e) => setForm({ ...form, apiVersion: e.target.value })} />
            </Field>
            <Field label="Default country code">
              <input className="input mono" value={form.defaultCountry} onChange={(e) => setForm({ ...form, defaultCountry: e.target.value })} />
            </Field>
            <Field label="Display number" fullWidth>
              <input className="input mono" value={form.displayNumber} onChange={(e) => setForm({ ...form, displayNumber: e.target.value })} />
            </Field>
            <Field label="Enable WhatsApp sends" fullWidth>
              <label className="check">
                <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                Outbound sends are {form.enabled ? "live" : "paused"}.
              </label>
            </Field>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>

      <div className="card">
        <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Test connection</div>
        <div className="form-grid form-grid--2">
          <Field label="Send hello_world to">
            <input className="input mono" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="10-digit mobile" />
          </Field>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button className="btn btn--ghost" onClick={onTest} disabled={test.isPending}>
              {test.isPending ? "Sending…" : "Send test"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, fullWidth, children }: { label: string; fullWidth?: boolean; children: React.ReactNode }) {
  return (
    <div className="field" style={fullWidth ? { gridColumn: "1 / -1" } : undefined}>
      <label className="field__label">{label}</label>
      {children}
    </div>
  );
}
