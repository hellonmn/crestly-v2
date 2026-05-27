import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TenantService } from "../tenant/tenant.service";
import type { ParentLoginInput, ParentLoginResponse, ParentKid } from "@crestly/shared";

/**
 * Parent portal queries run against the platform DB (which, in single-
 * tenant deployments, IS the school's DB). We deliberately don't use
 * RequestPrismaService — parents have no JWT at the login endpoint, so
 * the request has no tenant context.
 *
 * In a future multi-tenant world the parent login flow will need a
 * subdomain or query param to pick the right tenant DB; for now every
 * parent in this deployment maps to the platform DB.
 */
@Injectable()
export class ParentService {
  constructor(
    private readonly tenants: TenantService,
    private readonly jwt: JwtService,
  ) {}

  private get db() { return this.tenants.platform; }

  /** Public — returns just the school name for the login page header. */
  async schoolInfo(): Promise<{ name: string }> {
    try {
      const row = await this.db.$queryRawUnsafe<{ v: string }[]>(
        "SELECT v FROM school_info WHERE k = 'School Name' LIMIT 1",
      );
      const name = row[0]?.v?.trim();
      return { name: name || "School" };
    } catch {
      return { name: "School" };
    }
  }

  /** Mirrors erp/parent/lib/auth.php :: parent_login() exactly:
   *  match phone (last 10 digits) against ANY of the 7 parent-contact
   *  fields on the student row + DOB; on success, the session unlocks
   *  every sibling sharing the same family_id. */
  async login(input: ParentLoginInput): Promise<ParentLoginResponse> {
    const phone10 = lastTenDigits(input.phone);
    if (phone10.length !== 10) {
      throw new UnauthorizedException("Enter a 10-digit Indian mobile number.");
    }
    const dobIso = ddmmyyyyToIso(input.dob);
    if (!dobIso) {
      throw new UnauthorizedException("Enter the date of birth as DDMMYYYY.");
    }

    // Raw SQL — Prisma's string filters can't easily strip non-digits + take
    // the rightmost 10 chars across multiple columns. The PHP version uses
    // RIGHT(REGEXP_REPLACE(..., '[^0-9]', ''), 10) so we mirror that.
    const rows = await this.db.$queryRawUnsafe<{
      sr_number: number;
      student_name: string;
      class: string;
      section: string;
      dob: Date | null;
      family_id: number | null;
      is_hostel: number;
    }[]>(
      `
      SELECT sr_number, student_name, class, section, dob, family_id, is_hostel
      FROM students
      WHERE dob = ?
        AND status = 'active'
        AND (
              RIGHT(REGEXP_REPLACE(IFNULL(father_contact, ''),         '[^0-9]', ''), 10) = ?
           OR RIGHT(REGEXP_REPLACE(IFNULL(mother_contact, ''),         '[^0-9]', ''), 10) = ?
           OR RIGHT(REGEXP_REPLACE(IFNULL(father_whatsapp, ''),        '[^0-9]', ''), 10) = ?
           OR RIGHT(REGEXP_REPLACE(IFNULL(mother_whatsapp, ''),        '[^0-9]', ''), 10) = ?
           OR RIGHT(REGEXP_REPLACE(IFNULL(calling_number, ''),         '[^0-9]', ''), 10) = ?
           OR RIGHT(REGEXP_REPLACE(IFNULL(whatsapp_number, ''),        '[^0-9]', ''), 10) = ?
           OR RIGHT(REGEXP_REPLACE(IFNULL(local_guardian_contact, ''), '[^0-9]', ''), 10) = ?
        )
      LIMIT 1
      `,
      dobIso, phone10, phone10, phone10, phone10, phone10, phone10, phone10,
    );

    const hit = rows[0];
    if (!hit) {
      throw new UnauthorizedException(
        "We couldn't find a child with that mobile + date of birth. Check the values, or contact the school office.",
      );
    }

    // $queryRawUnsafe surfaces MySQL UNSIGNED INT columns as BigInt,
    // which the JWT signer (and JSON.stringify in general) can't handle.
    // Coerce to Number explicitly before anything downstream touches them.
    const hitSr       = Number(hit.sr_number);
    const familyId    = hit.family_id != null ? Number(hit.family_id) : null;
    const hitIsHostel = Number(hit.is_hostel) === 1;

    // Expand to siblings if the family_id is set; otherwise it's just
    // this one child.
    let kids: ParentKid[];
    if (familyId !== null) {
      const siblings = await this.db.student.findMany({
        where: { familyId, status: "active" },
        select: {
          srNumber: true, studentName: true, class: true, section: true,
          dob: true, is_hostel: true,
        },
        orderBy: { srNumber: "asc" },
      });
      kids = siblings.map((s) => ({
        srNumber: Number(s.srNumber),
        studentName: s.studentName,
        classLabel: `${s.class}-${s.section}`,
        dob: s.dob ? s.dob.toISOString().slice(0, 10) : null,
        isHostel: s.is_hostel,
      }));
    } else {
      kids = [{
        srNumber: hitSr,
        studentName: hit.student_name,
        classLabel: `${hit.class}-${hit.section}`,
        dob: hit.dob ? hit.dob.toISOString().slice(0, 10) : null,
        isHostel: hitIsHostel,
      }];
    }

    const srNumbers = kids.map((k) => k.srNumber);
    const accessToken = await this.jwt.signAsync({
      kind: "parent",
      phone: phone10,
      familyId,
      srs: srNumbers,
    });

    const label = kids.length === 1
      ? `+91 ${phone10} · ${kids[0]!.studentName}`
      : `+91 ${phone10} · ${kids.length} children`;

    return { accessToken, parentLabel: label, familyId, kids };
  }
}

/* ─────────────────── helpers ─────────────────── */

function lastTenDigits(raw: string): string {
  const d = raw.replace(/\D/g, "");
  return d.slice(-10);
}

/** "08072008" → "2008-07-08". Returns null on invalid date. */
function ddmmyyyyToIso(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 8) return null;
  const dd = Number(d.slice(0, 2));
  const mm = Number(d.slice(2, 4));
  const yy = Number(d.slice(4, 8));
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yy)) return null;
  // Cheap validity check via Date round-trip.
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  if (dt.getUTCFullYear() !== yy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return null;
  return `${String(yy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}
