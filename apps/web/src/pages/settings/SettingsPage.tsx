import { useEffect, useState } from "react";
import { PageHead } from "@/components/PageHead";
import { useSaveSchoolInfo, useSchoolInfo } from "./hooks";
import { getErrorMessage } from "@/lib/api";

/**
 * Settings — school identity, geofence, punch policy.
 * KV-backed by the `school_info` table. Mirrors erp/settings/index.php.
 */
export function SettingsPage() {
  const { data, isLoading } = useSchoolInfo();
  const save = useSaveSchoolInfo();
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) {
      const v: Record<string, string> = {};
      for (const [k, val] of Object.entries(data.values)) v[k] = val ?? "";
      setForm(v);
    }
  }, [data]);

  function bind(key: string) {
    return {
      value: form[key] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const patch: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(form)) patch[k] = v.trim() === "" ? null : v;
      await save.mutateAsync({ patch });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to save settings"));
    }
  }

  if (isLoading) return <p className="muted">Loading…</p>;

  return (
    <>
      <PageHead group="SYSTEM" title="Settings" lede="School identity, geofence, and punch policy." />

      {saved && (
        <div className="banner banner--success">
          <span>Settings saved.</span>
        </div>
      )}
      {error && (
        <div className="banner banner--error">
          <span>{error}</span>
        </div>
      )}

      <form className="card" onSubmit={onSubmit}>
        <Section num="01" title="General">
          <div className="form-grid form-grid--2">
            <Field label="School name"><input className="input" {...bind("School Name")} /></Field>
            <Field label="Board"><input className="input" placeholder="CBSE / ICSE / State…" {...bind("Board")} /></Field>
            <Field label="Time zone"><input className="input" placeholder="Asia/Kolkata" {...bind("Time Zone")} /></Field>
            <Field label="Address" fullWidth>
              <textarea className="input input--area" {...bind("Address")} />
            </Field>
          </div>
        </Section>

        <Section num="02" title="Geofence">
          <div className="form-grid form-grid--3">
            <Field label="Latitude"><input className="input" inputMode="decimal" {...bind("Geofence Latitude")} /></Field>
            <Field label="Longitude"><input className="input" inputMode="decimal" {...bind("Geofence Longitude")} /></Field>
            <Field label="Maps URL"><input className="input" {...bind("Geofence Maps URL")} /></Field>
            <Field label="School radius (m)"><input className="input" type="number" {...bind("Geofence Radius School")} /></Field>
            <Field label="Driver radius (m)"><input className="input" type="number" {...bind("Geofence Radius Driver")} /></Field>
          </div>
        </Section>

        <Section num="03" title="Punch policy">
          <div className="form-grid form-grid--2">
            <Field label="Cooldown after Punch In (minutes)">
              <input className="input" type="number" {...bind("Punch Cooldown Minutes")} />
            </Field>
            <Field label="After Punch Out">
              <input className="input" value="Locked until next day" disabled />
            </Field>
          </div>
        </Section>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button type="submit" className="btn btn--primary" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </>
  );
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="form-section">
      <div className="form-section__head">
        <span className="form-section__num">{num}</span>
        <span className="form-section__title">{title}</span>
      </div>
      {children}
    </div>
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
