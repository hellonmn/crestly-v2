import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useHostelRooms } from "./hooks";
import type { HostelBlock, HostelRoom, HostelRoomType } from "@crestly/shared";

export function HostelRoomsPage() {
  const [params, setParams] = useSearchParams();
  const block = (params.get("block") ?? "Boys") as HostelBlock;
  const roomType = (params.get("type") ?? "") as HostelRoomType | "";

  const { data, isLoading } = useHostelRooms({
    block,
    roomType: roomType || undefined,
  });

  function setBlock(b: HostelBlock) {
    const p = new URLSearchParams(params);
    p.set("block", b);
    setParams(p, { replace: true });
  }
  function setType(t: HostelRoomType | "") {
    const p = new URLSearchParams(params);
    if (t) p.set("type", t); else p.delete("type");
    setParams(p, { replace: true });
  }

  // Group rooms by floor for display.
  const byFloor = useMemo(() => {
    const m = new Map<string, HostelRoom[]>();
    for (const r of data ?? []) {
      const f = r.floor ?? "Ground floor";
      const list = m.get(f) ?? [];
      list.push(r);
      m.set(f, list);
    }
    return Array.from(m.entries()).sort();
  }, [data]);

  return (
    <>
      <PageHead
        group="HOSTEL"
        meta={`${block} block`}
        title="Rooms"
        lede={data ? `${data.length} rooms · ${data.reduce((s, r) => s + r.occupied, 0)} boarders` : "Loading…"}
        actions={
          <Link to="/hostel" className="btn btn--ghost btn--sm">
            <Icon name="chev-left" size={14} /> Back
          </Link>
        }
      />

      <div className="toolbar card">
        <div style={{ display: "flex", gap: 4 }}>
          <button className={`btn btn--sm ${block === "Boys" ? "btn--ink" : "btn--ghost"}`} onClick={() => setBlock("Boys")}>Boys</button>
          <button className={`btn btn--sm ${block === "Girls" ? "btn--ink" : "btn--ghost"}`} onClick={() => setBlock("Girls")}>Girls</button>
        </div>
        <div style={{ display: "flex", gap: 4, marginLeft: 12 }}>
          {(["", "Triple", "Twin", "Single"] as const).map((t) => (
            <button key={t || "all"} className={`btn btn--sm ${roomType === t ? "btn--ink" : "btn--ghost"}`} onClick={() => setType(t)}>
              {t || "All types"}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="muted">Loading…</p>}

      {byFloor.map(([floor, rooms]) => (
        <div key={floor} className="card">
          <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>{floor}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {rooms.map((r) => {
              const isEmpty = r.occupied === 0;
              const isFull = r.occupied >= r.capacity;
              return (
                <div
                  key={r.roomNo}
                  style={{
                    padding: 12,
                    border: isEmpty ? "1px dashed var(--rule-strong)" : "1px solid var(--rule)",
                    borderRadius: "var(--r-3)",
                    background: isEmpty ? "transparent" : "var(--white)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <div className="display-s" style={{ fontSize: 16 }}>{r.roomNo}</div>
                    <span className={`pill ${isFull ? "pill--success" : isEmpty ? "pill--neutral" : "pill--warn"}`}>
                      {r.occupied} / {r.capacity}
                    </span>
                  </div>
                  <div className="muted body-s" style={{ marginBottom: 8 }}>{r.roomType}</div>
                  {r.occupants.map((o) => (
                    <div key={o.srNumber} style={{ fontSize: 12, marginBottom: 2 }}>
                      <span className="mono muted">{o.srNumber}</span>{" "}
                      <Link to={`/students/${o.srNumber}`} style={{ textDecoration: "none", color: "inherit" }}>
                        {o.studentName}
                      </Link>{" "}
                      <span className="muted">· {o.class}-{o.section}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
