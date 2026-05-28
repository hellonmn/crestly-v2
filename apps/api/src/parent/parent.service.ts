import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
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
  private readonly log = new Logger(ParentService.name);

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
    } catch (e) {
      this.log.warn(`schoolInfo failed: ${(e as Error).message}`);
      return { name: "School" };
    }
  }

  /**
   * Two-step parent login (single-tenant for now):
   *   1. Find students whose DOB matches. Usually 1-3 rows in a school.
   *   2. In JS, strip non-digits from EVERY contact field of every
   *      candidate and match the last 10 digits against the input.
   *
   * We deliberately skip MySQL's REGEXP_REPLACE — older shared hosts
   * have spotty regex support, and the DOB-narrowed candidate list is
   * tiny so the per-row compare is fine.
   */
  async login(input: ParentLoginInput): Promise<ParentLoginResponse> {
    const phone10 = lastTenDigits(input.phone);
    if (phone10.length !== 10) {
      throw new UnauthorizedException("Enter a 10-digit Indian mobile number.");
    }
    const dobIso = ddmmyyyyToIso(input.dob);
    if (!dobIso) {
      throw new UnauthorizedException("Enter the date of birth as DDMMYYYY.");
    }

    // Step 1: candidates by DOB. Cast to plain strings/numbers right away
    // so BigInt doesn't leak into anything downstream.
    const candidates = await this.db.student.findMany({
      where: {
        dob: new Date(`${dobIso}T00:00:00Z`),
        status: "active",
      },
      select: {
        srNumber: true, studentName: true, class: true, section: true,
        familyId: true, dob: true, is_hostel: true,
        fatherContact: true, motherContact: true,
        father_whatsapp: true, mother_whatsapp: true,
        callingNumber: true, whatsappNumber: true,
        local_guardian_contact: true,
      },
    });

    if (candidates.length === 0) {
      this.log.log(`parent login miss — no students with dob=${dobIso}`);
      throw new UnauthorizedException(
        "We couldn't find a child with that mobile + date of birth. Check the values, or contact the school office.",
      );
    }

    // Step 2: match the phone (last 10 digits) against ANY contact field.
    const matched = candidates.find((s) => {
      const phones = [
        s.fatherContact, s.motherContact,
        s.father_whatsapp, s.mother_whatsapp,
        s.callingNumber, s.whatsappNumber,
        s.local_guardian_contact,
      ];
      return phones.some((p) => lastTenDigits(p ?? "") === phone10);
    });

    if (!matched) {
      this.log.log(
        `parent login miss — phone ${phone10} not in any contact field of ${candidates.length} dob match(es)`,
      );
      throw new UnauthorizedException(
        "We couldn't find a child with that mobile + date of birth. Check the values, or contact the school office.",
      );
    }

    const familyId = matched.familyId != null ? Number(matched.familyId) : null;

    // Step 3: expand to siblings via family_id if present.
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
        srNumber: Number(matched.srNumber),
        studentName: matched.studentName,
        classLabel: `${matched.class}-${matched.section}`,
        dob: matched.dob ? matched.dob.toISOString().slice(0, 10) : null,
        isHostel: matched.is_hostel,
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

    this.log.log(`parent login ok — phone=${phone10} family=${familyId} kids=${kids.length}`);
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
