import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { useStudents } from "./hooks";
import { useAuth } from "@/lib/auth-store";

/**
 * Students list — CDS-faithful. Toolbar + table styled with the same classes
 * used in erp/students/index.php (.toolbar, .table-card, .pill, .cls-pill).
 */
export function StudentsListPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const { data, isLoading, error } = useStudents({ q: q || undefined, pageSize: 50, page: 1 });
  const canManage = (user?.permissions ?? []).includes("students.manage");

  return (
    <>
      <PageHead
        group="RECORDS"
        title="Students"
        lede={
          data
            ? `${data.total.toLocaleString("en-IN")} on record · current session`
            : "Loading…"
        }
        actions={
          canManage ? (
            <Link to="/students/new" className="btn btn--primary btn--sm">
              <Icon name="plus" size={14} />
              New student
            </Link>
          ) : null
        }
      />

      <div className="toolbar card">
        <div className="search">
          <Icon name="search" size={14} />
          <input
            type="search"
            placeholder="Search by name or parent contact…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14 }}
          />
        </div>
      </div>

      <div className="table-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>SR #</th>
              <th>Name</th>
              <th>Class</th>
              <th>Father</th>
              <th>Contact</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>
                  Loading…
                </td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--error)" }}>
                  Failed to load students
                </td>
              </tr>
            )}
            {!isLoading && data?.items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>
                  No matches
                </td>
              </tr>
            )}
            {data?.items.map((s) => (
              <tr key={s.srNumber}>
                <td className="td-sr mono">{s.srNumber}</td>
                <td className="td-name">
                  <Link to={`/students/${s.srNumber}`} style={{ textDecoration: "none", color: "inherit" }}>
                    {s.studentName}
                  </Link>
                </td>
                <td>
                  <span className="cls-pill">{s.class}-{s.section}</span>
                </td>
                <td className="muted">{s.fatherName ?? "—"}</td>
                <td className="muted">{s.fatherContact ?? s.motherContact ?? s.callingNumber ?? "—"}</td>
                <td>
                  <span className={`pill ${s.status === "active" ? "pill--success" : "pill--neutral"}`}>
                    <span className="pill__dot" />
                    {s.status}
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
