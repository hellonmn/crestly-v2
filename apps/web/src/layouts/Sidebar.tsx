import { Link, NavLink } from "react-router-dom";
import { Icon, CrestlyLogo, type IconName } from "@crestly/icons";
import { useAuth } from "@/lib/auth-store";
import { BrandDot } from "@/components/BrandDot";

type Tint = "mint" | "peach" | "rose" | "mustard" | "wheat" | "sky";

interface NavEntry {
  to: string;
  end?: boolean;
  label: string;
  icon: IconName;
  tint: Tint;
  /** Required permission key — entry hides when the user lacks it. Undefined = always visible. */
  perm?: string;
  /** Optional badge count source key — UI logic plugs in counts later. */
  badge?: number;
}

interface NavGroup {
  title?: string;
  /** When the group has no title we render the items at the top, no header. */
  items: NavEntry[];
}

/**
 * Sidebar nav structure ported 1:1 from erp/includes/header.php. Visibility
 * is driven by:
 *   - the user's `perm` (from JWT)
 *   - per-school feature flags (TODO: wire to /api/features map; for now everything visible)
 *
 * Groups collapse via the components.css behaviour and a small bit of JS in
 * AppShell that persists open/closed state to localStorage.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: "/", end: true, label: "Dashboard", icon: "dashboard", tint: "wheat", perm: "dashboard.view" }],
  },
  {
    title: "My Day",
    items: [
      { to: "/diary", label: "Daily Diary", icon: "diary", tint: "wheat", perm: "diary.log" },
      { to: "/leaves", label: "My Leaves", icon: "leaves", tint: "sky", perm: "leaves.apply" },
      { to: "/punch", label: "Punch In / Out", icon: "punch", tint: "mint", perm: "staff.punch" },
      { to: "/review-history", label: "Review History", icon: "review-history", tint: "mint" },
      { to: "/salary", label: "Salary", icon: "salary", tint: "mustard" },
      { to: "/staff-attendance", label: "Staff Attendance", icon: "staff-attendance", tint: "rose", perm: "staff.view_team" },
    ],
  },
  {
    title: "Records",
    items: [
      { to: "/attendance", label: "Attendance", icon: "attendance", tint: "sky", perm: "attendance.mark" },
      { to: "/classes", label: "Classes", icon: "classes", tint: "wheat", perm: "classes.view" },
      { to: "/exams", label: "Exams", icon: "exams", tint: "mustard", perm: "exams.view" },
      { to: "/families", label: "Families", icon: "families", tint: "rose" },
      { to: "/hostel", label: "Hostel", icon: "hostel", tint: "peach" },
      { to: "/streams", label: "Streams", icon: "streams", tint: "sky", perm: "students.view" },
      { to: "/students", label: "Students", icon: "students", tint: "mint", perm: "students.view" },
      { to: "/team", label: "Team", icon: "team", tint: "rose", perm: "team.view" },
      { to: "/timetable", label: "Timetable", icon: "timetable", tint: "sky", perm: "timetable.view" },
    ],
  },
  {
    title: "Admission",
    items: [
      { to: "/admissions", label: "Enquiries", icon: "admissions", tint: "wheat", perm: "admissions.view" },
      { to: "/admissions/followups", label: "Follow-ups", icon: "follow-ups", tint: "sky", perm: "admissions.view" },
    ],
  },
  {
    title: "Finance",
    items: [
      { to: "/daily-report", label: "Daily Report", icon: "daily-report", tint: "wheat", perm: "ledger.view" },
      { to: "/fee-ledger", label: "Fee Ledger", icon: "fee-ledger", tint: "mustard", perm: "fees.view" },
      { to: "/fee-structure", label: "Fee Structure", icon: "fee-structure", tint: "rose", perm: "fee_structure.view" },
      { to: "/ledger", label: "Expense Ledger", icon: "ledger", tint: "peach", perm: "ledger.view" },
      { to: "/vouchers", label: "Vouchers", icon: "vouchers", tint: "rose", perm: "vouchers.create" },
    ],
  },
  {
    title: "Logistics",
    items: [{ to: "/transport", label: "Transport", icon: "transport", tint: "sky" }],
  },
  {
    title: "HR",
    items: [
      { to: "/hr", label: "HR Dashboard", icon: "hr", tint: "rose", perm: "hr.dashboard" },
      { to: "/approvals", label: "Approvals", icon: "approvals", tint: "mint" },
      { to: "/promotion", label: "Promotion", icon: "promotion", tint: "mustard", perm: "students.promote" },
      { to: "/import", label: "Import", icon: "import", tint: "peach" },
      { to: "/notifications", label: "Notifications", icon: "notifications", tint: "wheat" },
      { to: "/shifts", label: "Duty Hours", icon: "shifts", tint: "sky", perm: "shifts.manage" },
      { to: "/holidays", label: "Holidays", icon: "holidays", tint: "mint" },
    ],
  },
  {
    title: "System",
    items: [
      { to: "/settings", label: "Settings", icon: "settings", tint: "wheat" },
      { to: "/features", label: "Upgrade Plan", icon: "features", tint: "mustard" },
    ],
  },
];

export function Sidebar({ schoolName }: { schoolName: string }) {
  const { user } = useAuth();
  const session = "2025-26"; // TODO: hydrate from /api/sessions/current

  const can = (perm?: string) => !perm || (user?.permissions ?? []).includes(perm);
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => can(i.perm)),
  })).filter((g) => g.items.length > 0);

  return (
    <aside className="app__nav" id="app-nav">
      <Link to="/" className="brand-block" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="brand-block__logo">
          <CrestlyLogo width={32} height={32} />
        </div>
        <div>
          <div className="brand-block__name">
            {schoolName}
            <BrandDot />
          </div>
          <div className="brand-block__sub">SCHOOL ERP</div>
        </div>
      </Link>

      <div className="session-block">
        <span className="session-block__dot" />
        <div>
          <div className="session-block__lbl">SESSION</div>
          <div className="session-block__val">{session}</div>
        </div>
      </div>

      <div className="app__nav-items">
        {visibleGroups.map((group, idx) => (
          <div key={group.title ?? `g${idx}`}>
            {group.title && <div className="nav-section">{group.title}</div>}
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item ${isActive ? "is-active" : ""}`}
                style={{ textDecoration: "none" }}
              >
                <span className={`nav-item__icon icon-tint-${item.tint}`}>
                  <Icon name={item.icon} size={14} />
                </span>
                <span className="nav-item__label">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="pill pill--warn" style={{ marginLeft: "auto", padding: "1px 8px", fontSize: 11 }}>
                    {item.badge}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {user && (
        <Link to="/logout" className="user-block" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="user-block__avi">{user.name?.[0]?.toUpperCase() ?? "?"}</div>
          <div className="user-block__body">
            <div className="user-block__name">{user.name}</div>
            <div className="user-block__role">{user.roleName ?? "—"}</div>
          </div>
          <Icon name="logout" size={14} />
        </Link>
      )}
    </aside>
  );
}
