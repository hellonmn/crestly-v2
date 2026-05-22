import { useState } from "react";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { usePunch } from "./hooks";
import { getErrorMessage } from "@/lib/api";

interface GeoState {
  status: "idle" | "loading" | "ok" | "error";
  coords?: { latitude: number; longitude: number; accuracy: number };
  message?: string;
}

/**
 * Self-service punch. Step 1: get geolocation. Step 2: type a note (selfie
 * capture comes in Batch F when we wire the upload pipeline). Step 3: punch.
 */
export function PunchPage() {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<"in" | "out">("in");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const punch = usePunch();

  function fetchGeo() {
    setGeo({ status: "loading" });
    if (!("geolocation" in navigator)) {
      setGeo({ status: "error", message: "Geolocation not supported by this browser" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGeo({
        status: "ok",
        coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy },
      }),
      (err) => setGeo({ status: "error", message: err.message }),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function onPunch() {
    setError(null);
    setResult(null);
    if (!geo.coords) {
      setError("Get your location first.");
      return;
    }
    try {
      const saved = await punch.mutateAsync({
        punchType: type,
        latitude: geo.coords.latitude,
        longitude: geo.coords.longitude,
        accuracyM: Math.round(geo.coords.accuracy),
        notes: notes || null,
      });
      setResult(`Punch ${saved.punchType.toUpperCase()} recorded at ${new Date(saved.punchedAt).toLocaleTimeString("en-IN")}.`);
      setNotes("");
    } catch (e) {
      setError(getErrorMessage(e, "Punch failed"));
    }
  }

  return (
    <>
      <PageHead group="MY DAY" title="Punch In / Out" lede="Geo-fenced self-service punch." />

      {result && <div className="banner banner--success"><Icon name="check" size={16} /><span>{result}</span></div>}
      {error && <div className="banner banner--error"><Icon name="alert" size={16} /><span>{error}</span></div>}

      <div className="card">
        <div className="display-s" style={{ marginBottom: 16 }}>Step 1 · Get your location</div>
        {geo.status === "idle" && (
          <button className="btn btn--primary" onClick={fetchGeo}>
            <Icon name="search" size={14} /> Allow location
          </button>
        )}
        {geo.status === "loading" && <p className="muted">Detecting location…</p>}
        {geo.status === "ok" && geo.coords && (
          <div className="banner banner--success">
            <Icon name="check" size={16} />
            <span className="mono">
              {geo.coords.latitude.toFixed(6)}, {geo.coords.longitude.toFixed(6)} · ±{Math.round(geo.coords.accuracy)}m
            </span>
            <button className="btn btn--ghost btn--sm" onClick={fetchGeo} style={{ marginLeft: "auto" }}>
              Refresh
            </button>
          </div>
        )}
        {geo.status === "error" && (
          <div className="banner banner--error">
            <Icon name="alert" size={16} />
            <span>{geo.message ?? "Location unavailable"}</span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="display-s" style={{ marginBottom: 16 }}>Step 2 · Punch</div>
        <div className="form-grid form-grid--2">
          <div className="field">
            <label className="field__label">Type</label>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as "in" | "out")}>
              <option value="in">Punch In</option>
              <option value="out">Punch Out</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label className="field__label">Note (optional)</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={255} />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn btn--primary"
              onClick={onPunch}
              disabled={geo.status !== "ok" || punch.isPending}
            >
              <Icon name="punch" size={14} /> {punch.isPending ? "Saving…" : `Punch ${type.toUpperCase()}`}
            </button>
          </div>
        </div>
        <p className="muted body-s" style={{ marginTop: 8, marginBottom: 0 }}>
          Selfie capture lands in Batch F (cross-cutting), alongside the file-upload pipeline.
        </p>
      </div>
    </>
  );
}
