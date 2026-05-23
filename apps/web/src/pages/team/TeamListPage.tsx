import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@crestly/icons";
import { PageHead } from "@/components/PageHead";
import { StatTile } from "@/components/StatTile";
import { Skeleton } from "@/components/Skeleton";
import { useTeamList } from "./hooks";
import { useAuth } from "@/lib/auth-store";

export function TeamListPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");
  const { data, isLoading } = useTeamList({
    q: q || undefined,
    department: department || undefined,
    status: status || undefined,
    pageSize: 100,
    page: 1,
  });
  const canManage = (user?.permissions ?? []).includes("team.manage");
  const canRoles = (user?.permissions ?? []).includes("team.roles");

  return (
    <>
      <PageHead
        group="RECORDS"
        title="Team"
        lede={data ? `${data.total.toLocaleString("en-IN")} on record` : "Loading…"}
        actions={
          <>
            {canRoles && (
              <Link to="/team/roles" className="btn btn--ghost btn--sm">
                <Icon name="settings" size={14} /> Roles
              </Link>
            )}
            {canManage && (
              <Link to="/team/new" className="btn btn--primary btn--sm">
                <Icon name="plus" size={14} /> Add member
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid--cols-4 grid--gap-sm">
        <StatTile tint="mustard" icon="team" label="ACTIVE MEMBERS" value={String(data?.total ?? "—")} delta="" />
        <StatTile tint="rose" icon="hr" label="DEPARTMENTS" value="—" delta="Filter to count" />
        <StatTile tint="wheat" icon="features" label="YOUR ROLE" value={user?.roleName ?? "—"} delta={`${user?.permissions.length ?? 0} perms`} />
        <StatTile tint="sky" icon="settings" label="EDIT ROLES" value="" delta={canRoles ? "Open Roles →" : "Locked"} />
      </div>

      <div className="toolbar card">
        <div className="search">
          <Icon name="search" size={14} />
          <input
            type="search"
            placeholder="Search by name, phone, email, employee id…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontSize: 14 }}
          />
        </div>
        <input
          className="input"
          style={{ maxWidth: 180 }}
          placeholder="Department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        />
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value as "" | "active" | "inactive")}>
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="table-card">
        {isLoading ? (
          <Skeleton.Table rows={6} cols={5} />
        ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Department · Designation</th>
              <th>Mobile</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--ink-40)" }}>
                  No matches
                </td>
              </tr>
            )}
            {data?.items.map((m) => (
              <tr key={m.id}>
                <td className="td-name">
                  <Link to={`/team/${m.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                    {m.name}
                    {m.employeeId && <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>#{m.employeeId}</span>}
                  </Link>
                </td>
                <td className="muted">
                  {m.department ?? "—"}
                  {m.designation && <> · {m.designation}</>}
                </td>
                <td className="mono">{m.phone ?? "—"}</td>
                <td>{m.roleName ?? <span className="muted">—</span>}</td>
                <td>
                  <span className={`pill ${m.status === "active" ? "pill--success" : "pill--neutral"}`}>
                    <span className="pill__dot" />
                    {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </>
  );
}
