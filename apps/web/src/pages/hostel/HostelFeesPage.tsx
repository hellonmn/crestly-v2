import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useHostelFees } from "./hooks";

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

export function HostelFeesPage() {
  const { data, isLoading } = useHostelFees();

  return (
    <>
      <PageHead
        group="HOSTEL"
        title="Fees"
        lede="Reference schedule for boarders. Edit master rates under Fee Structure."
        actions={
          <Link to="/hostel" className="btn btn--ghost btn--sm">
            <Icon name="chev-left" size={14} /> Back
          </Link>
        }
      />

      {isLoading && <p className="muted">Loading…</p>}

      {data && (
        <div className="grid grid--cols-3 grid--gap-sm">
          <div className="card">
            <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>One-time (year 1)</div>
            <div className="detail-list">
              <Row k="Admission deposit" v={fmt(data.oneTime.admissionDeposit)} />
              <Row k="Bedding" v={fmt(data.oneTime.bedding)} />
              <Row k="Medical check-up" v={fmt(data.oneTime.medicalCheckup)} />
            </div>
          </div>

          <div className="card">
            <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Annual lodging</div>
            <div className="detail-list">
              <Row k="Triple sharing" v={fmt(data.annualLodging.triple)} />
              <Row k="Twin sharing" v={fmt(data.annualLodging.twin)} />
              <Row k="Single" v={fmt(data.annualLodging.single)} />
            </div>
          </div>

          <div className="card">
            <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Annual common</div>
            <div className="detail-list">
              <Row k="Mess" v={fmt(data.annualCommon.mess)} />
              <Row k="Laundry" v={fmt(data.annualCommon.laundry)} />
              <Row k="Utilities" v={fmt(data.annualCommon.utilities)} />
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="card">
          <div className="display-s" style={{ marginBottom: 12, fontSize: 18 }}>Payment terms</div>
          <ul style={{ paddingLeft: 20, lineHeight: 1.7, color: "var(--ink)" }}>
            {data.paymentTerms.map((t, i) => <li key={i}>{t}</li>)}
            <li>Sibling discount on lodging: <b>{data.siblingDiscountPct}%</b>.</li>
          </ul>
        </div>
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="detail-row">
      <div className="detail-row__k">{k}</div>
      <div className="detail-row__v">{v}</div>
    </div>
  );
}
