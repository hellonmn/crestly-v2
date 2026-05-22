import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { useVouchers } from "./hooks";
import type { VoucherStatus } from "@crestly/shared";

const STATUS_PILL: Record<VoucherStatus, string> = {
  draft: "pill--neutral",
  pending_approval: "pill--warn",
  approved: "pill--info",
  rejected: "pill--error",
  cancelled: "pill--neutral",
};

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

export function VouchersListPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<VoucherStatus | "">("");
  const [mine, setMine] = useState(false);

  const { data, isLoading } = useVouchers({
    q: q || undefined,
    status: status || undefined,
    mine: mine || undefined,
    pageSize: 100,
    page: 1,
  });

  return (
    <>
      <PageHead
        group="FINANCE"
        title="Expense Vouchers"
        lede={data ? `${data.total.toLocaleString("en-IN")} vouchers · ${fmt(data.totalAmount)} total` : "Loading…"}
        actions={
          <Link to="/vouchers/new" className="btn btn--primary btn--sm">
            <Icon name="plus" size={14} /> New voucher
          </Link>
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mustard" icon="rupee" label="TOTAL" value={data ? fmt(data.totalAmount) : "—"} delta={`${data?.total ?? "—"} vouchers`} />
        <StatTile tint="mint" icon="check" label="PAID" value={data ? fmt(data.paidAmount) : "—"} delta="" />
        <StatTile tint="rose" icon="rupee" label="CREDIT UNPAID" value={data ? fmt(data.creditUnpaid) : "—"} delta="" />
        <StatTile tint="wheat" icon="alert" label="PENDING APPROVAL" value={String(data?.pendingApproval ?? "—")} delta="" />
      </div>

      <div className="toolbar card">
        <div className="search">
          <Icon name="search" size={14} />
          <input
            type="search"
            placeholder="Search by title, vendor, voucher #…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14 }}
          />
        </div>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as VoucherStatus | "")}>
          <option value="">All status</option>
          <option value="pending_approval">Pending approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
          <option value="draft">Draft</option>
        </select>
        <label className="check" style={{ marginLeft: "auto" }}>
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} />
          Mine only
        </label>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Voucher #</th>
              <th>Title</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>Loading…</td></tr>}
            {data?.items.map((v) => (
              <tr key={v.id}>
                <td className="mono">
                  <Link to={`/vouchers/${v.id}`} style={{ textDecoration: "none", color: "inherit" }}>{v.voucherNo}</Link>
                </td>
                <td className="td-name">
                  {v.title}
                  <div className="muted body-s">{v.createdByName ?? "—"}</div>
                </td>
                <td className="muted">{v.vendorName ?? "—"}</td>
                <td>{v.category ? <span className="pill pill--wheat">{v.category}</span> : <span className="muted">—</span>}</td>
                <td className="mono">{fmt(v.amount)}</td>
                <td className="mono">{v.voucherDate}</td>
                <td>
                  <span className={`pill ${STATUS_PILL[v.status]}`}>
                    <span className="pill__dot" />
                    {v.status.replace("_", " ")}
                  </span>
                  {v.isCreditBill && <span className="pill pill--info" style={{ marginLeft: 4, fontSize: 9 }}>CREDIT</span>}
                </td>
                <td>
                  <span className={`pill ${v.paymentStatus === "paid" ? "pill--success" : v.paymentStatus === "partial" ? "pill--info" : "pill--warn"}`}>
                    {v.paymentStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
