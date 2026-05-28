import { ForbiddenException, Injectable, Logger, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TenantService } from "../tenant/tenant.service";
import type {
  ParentAttendanceMonth,
  ParentContactResponse, ParentContactStaff,
  ParentDiaryResponse,
  ParentExamsResponse,
  ParentFeesResponse,
  ParentKid,
  ParentLoginInput, ParentLoginResponse,
  ParentMoreInfo,
  ParentTimetableResponse,
} from "@crestly/shared";

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

  /* ============================================================
     Data endpoints — each requires the kid SR to be in the
     parent's JWT scope. The controller passes `allowedSrs` from
     the verified token.
     ============================================================ */

  private ensureScope(sr: number, allowedSrs: number[]) {
    if (!allowedSrs.includes(sr)) {
      throw new ForbiddenException("That child is not in your account.");
    }
  }

  private async currentSessionCode(): Promise<string> {
    const row = await this.db.session.findFirst({
      where: { isCurrent: true },
      select: { code: true },
    });
    return row?.code ?? "";
  }

  /** Re-fetch the kid list for an authenticated parent (used by /parent/me). */
  async kidsForSession(allowedSrs: number[], phone10: string, familyId: number | null): Promise<ParentLoginResponse> {
    const rows = await this.db.student.findMany({
      where: { srNumber: { in: allowedSrs }, status: "active" },
      select: {
        srNumber: true, studentName: true, class: true, section: true,
        dob: true, is_hostel: true,
      },
      orderBy: { srNumber: "asc" },
    });
    const kids: ParentKid[] = rows.map((s) => ({
      srNumber: Number(s.srNumber),
      studentName: s.studentName,
      classLabel: `${s.class}-${s.section}`,
      dob: s.dob ? s.dob.toISOString().slice(0, 10) : null,
      isHostel: s.is_hostel,
    }));
    const label = kids.length === 1
      ? `+91 ${phone10} · ${kids[0]!.studentName}`
      : `+91 ${phone10} · ${kids.length} children`;
    // No fresh token issued here — the existing one is still valid.
    return { accessToken: "", parentLabel: label, familyId, kids };
  }

  /* ─── ATTENDANCE ─── */

  async attendance(sr: number, month: string, allowedSrs: number[]): Promise<ParentAttendanceMonth> {
    this.ensureScope(sr, allowedSrs);
    const [yy, mm] = month.split("-").map(Number);
    if (!yy || !mm || mm < 1 || mm > 12) {
      throw new NotFoundException("Bad month");
    }
    const monthStart = new Date(Date.UTC(yy, mm - 1, 1));
    const monthEnd = new Date(Date.UTC(yy, mm, 0));     // last day
    const sessionCode = await this.currentSessionCode();

    // Whole-month rows
    const rows = await this.db.attendance.findMany({
      where: {
        sr_number: sr,
        session_code: sessionCode,
        attendance_date: { gte: monthStart, lte: monthEnd },
      },
      select: { attendance_date: true, status: true },
    });
    const days: Record<string, string> = {};
    let present = 0, absent = 0, late = 0, excused = 0;
    for (const r of rows) {
      const d = r.attendance_date.toISOString().slice(8, 10).replace(/^0/, "");
      days[d] = r.status;
      if (r.status === "present") present++;
      else if (r.status === "absent") absent++;
      else if (r.status === "late") late++;
      else if (r.status === "excused") excused++;
    }
    const marked = present + absent + late + excused;
    const percent = marked > 0 ? Math.round((present / marked) * 100) : 0;

    // Today + last 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = today.toISOString().slice(0, 10);
    const todayRow = await this.db.attendance.findFirst({
      where: { sr_number: sr, attendance_date: today },
      select: { status: true },
    });
    const todayStatus = todayRow?.status ?? "not_marked";

    const last7: { iso: string; status: string }[] = [];
    const last7Map = new Map<string, string>();
    const sevenAgo = new Date(today);
    sevenAgo.setDate(sevenAgo.getDate() - 6);
    const last7Rows = await this.db.attendance.findMany({
      where: { sr_number: sr, attendance_date: { gte: sevenAgo, lte: today } },
      select: { attendance_date: true, status: true },
    });
    for (const r of last7Rows) last7Map.set(r.attendance_date.toISOString().slice(0, 10), r.status);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      last7.push({ iso, status: last7Map.get(iso) ?? "not_marked" });
    }

    return {
      srNumber: sr,
      month,
      todayStatus,
      monthSummary: { present, absent, late, excused, marked, percent },
      days,
      last7,
      // todayKey unused by client but kept inline for parity
      ...(todayKey ? {} : {}),
    };
  }

  /* ─── EXAMS ─── */

  async exams(sr: number, allowedSrs: number[]): Promise<ParentExamsResponse> {
    this.ensureScope(sr, allowedSrs);
    const sessionCode = await this.currentSessionCode();

    const student = await this.db.student.findUnique({ where: { srNumber: sr }, select: { class: true } });
    const classSlug = student?.class ?? "";

    // Find class subjects + terms; left-join marks to compute final %s per subject.
    const [classSubjects, terms] = await Promise.all([
      this.db.exam_class_subjects.findMany({
        where: { class_slug: classSlug },
        orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        include: { exam_subjects: true },
      }),
      this.db.exam_terms.findMany({
        where: { session_code: sessionCode },
        orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      }),
    ]);
    const subjectIds = classSubjects.map((cs) => cs.subject_id);
    const termIds = terms.map((t) => t.id);
    const marks = subjectIds.length > 0 && termIds.length > 0
      ? await this.db.exam_marks.findMany({
          where: { sr_number: sr, subject_id: { in: subjectIds }, term_id: { in: termIds } },
          select: { subject_id: true, term_id: true, marks_obtained: true, max_marks: true },
        })
      : [];
    const markBy = new Map<string, { pct: number }>();
    for (const m of marks) {
      const pct = m.max_marks > 0 ? (m.marks_obtained / m.max_marks) * 100 : 0;
      markBy.set(`${m.subject_id}|${m.term_id}`, { pct });
    }

    // Per-subject final % = weighted average across terms
    type Subj = { id: number; name: string; shortCode: string; finalPct: number | null; finalGrade: string | null };
    const subjects: Subj[] = classSubjects.map((cs) => {
      const sub = cs.exam_subjects;
      let totalWeight = 0, weighted = 0, hasAny = false;
      for (const t of terms) {
        const got = markBy.get(`${sub.id}|${t.id}`);
        if (!got) continue;
        hasAny = true;
        const w = t.weight_percent ?? 0;
        weighted += got.pct * w;
        totalWeight += w;
      }
      const finalPct = hasAny && totalWeight > 0 ? Math.round((weighted / totalWeight) * 10) / 10 : null;
      return {
        id: sub.id, name: sub.name, shortCode: sub.short_code,
        finalPct,
        finalGrade: finalPct == null ? null : gradeFromPct(finalPct),
      };
    });

    // Per-term overall % across all subjects
    const termRows = terms.map((t) => {
      let totalWeight = 0, weighted = 0, hasAny = false;
      for (const sub of classSubjects) {
        const got = markBy.get(`${sub.subject_id}|${t.id}`);
        if (!got) continue;
        hasAny = true;
        weighted += got.pct;
        totalWeight += 1;
      }
      return {
        id: t.id,
        name: t.name,
        shortCode: t.short_code,
        weightPercent: t.weight_percent ?? 0,
        pct: hasAny && totalWeight > 0 ? Math.round((weighted / totalWeight) * 10) / 10 : null,
      };
    });

    // Overall
    const filledSubjects = subjects.filter((s) => s.finalPct != null);
    let overall: ParentExamsResponse["overall"] = null;
    if (filledSubjects.length > 0) {
      const avg = filledSubjects.reduce((s, x) => s + (x.finalPct ?? 0), 0) / filledSubjects.length;
      const round = Math.round(avg * 10) / 10;
      overall = {
        weightedPct: round,
        grade: gradeFromPct(round),
        result: round >= 33 ? "PASS" : "FAIL",
        totalObtained: filledSubjects.reduce((s, x) => s + (x.finalPct ?? 0), 0),
        totalMax: filledSubjects.length * 100,
      };
    }

    return {
      srNumber: sr,
      sessionCode,
      overall,
      subjects,
      terms: termRows,
    };
  }

  /* ─── FEES ─── */

  async fees(sr: number, allowedSrs: number[]): Promise<ParentFeesResponse> {
    this.ensureScope(sr, allowedSrs);
    const sessionCode = await this.currentSessionCode();

    const sf = await this.db.studentFee.findFirst({
      where: { srNumber: sr, sessionCode },
    });
    const payments = await this.db.fee_payments.findMany({
      where: { sr_number: sr, session_code: sessionCode, is_voided: false },
      orderBy: { paid_on: "desc" },
      select: {
        id: true, receipt_no: true, paid_on: true, amount: true, method: true,
        reference: true, recorded_by: true,
      },
    });

    const totalCharged = sf?.totalThisYear ?? 0;
    const paidAmount   = sf?.paidAmount    ?? 0;
    const dueAmount    = sf?.dueAmount     ?? Math.max(0, totalCharged - paidAmount);
    const status       = sf?.paymentStatus ?? "pending";

    const breakdown: { label: string; amount: number; note?: string }[] = [];
    if (sf) {
      if (sf.tuitionPayable > 0)  breakdown.push({ label: "Tuition fee",   amount: sf.tuitionPayable });
      if (sf.annualCharges > 0)   breakdown.push({ label: "Annual charges",amount: sf.annualCharges });
      if (sf.activityFee > 0)     breakdown.push({ label: "Activity fee",  amount: sf.activityFee });
      if (sf.examFee > 0)         breakdown.push({ label: "Exam fee",      amount: sf.examFee });
    }

    return {
      srNumber: sr,
      sessionCode,
      status,
      totalCharged,
      paidAmount,
      dueAmount,
      breakdown,
      payments: payments.map((p) => ({
        id: Number(p.id),
        receiptNo: p.receipt_no,
        paidOn: p.paid_on.toISOString().slice(0, 10),
        amount: p.amount,
        method: p.method,
        reference: p.reference,
        recordedBy: p.recorded_by,
      })),
    };
  }

  /* ─── DIARY ─── */

  async diary(sr: number, date: string, allowedSrs: number[]): Promise<ParentDiaryResponse> {
    this.ensureScope(sr, allowedSrs);
    const sessionCode = await this.currentSessionCode();
    const day = new Date(`${date}T00:00:00Z`);

    const student = await this.db.student.findUnique({
      where: { srNumber: sr },
      select: { class: true, section: true },
    });
    const classSlug = student?.class ?? "";
    const sectionCode = student?.section ?? "";
    const classLabel = `${classSlug}-${sectionCode}`;

    // Class-day entries (one per period)
    const rows = await this.db.class_diary.findMany({
      where: {
        session_code: sessionCode,
        class_slug: classSlug,
        section_code: sectionCode,
        entry_date: day,
      },
      include: {
        timetable_periods: { select: { name: true, start_time: true, end_time: true } },
        exam_subjects: { select: { name: true, short_code: true } },
        users_class_diary_teacher_user_idTousers: { select: { name: true } },
      },
      orderBy: { period_id: "asc" },
    });

    const entries = rows.map((r) => ({
      periodName: r.timetable_periods?.name ?? "",
      startTime:  r.timetable_periods?.start_time ? toHMS(r.timetable_periods.start_time) : null,
      endTime:    r.timetable_periods?.end_time   ? toHMS(r.timetable_periods.end_time)   : null,
      subjectName: r.exam_subjects?.name ?? null,
      subjectCode: r.exam_subjects?.short_code ?? null,
      teacherName: r.users_class_diary_teacher_user_idTousers?.name ?? null,
      topic:    r.topic    ?? null,
      homework: r.homework ?? null,
    }));

    // Recent dates with entries (last 7 distinct)
    const recent = await this.db.class_diary.findMany({
      where: { session_code: sessionCode, class_slug: classSlug, section_code: sectionCode },
      orderBy: { entry_date: "desc" },
      distinct: ["entry_date"],
      take: 7,
      select: { entry_date: true },
    });
    const recentDates = recent.map((r) => r.entry_date.toISOString().slice(0, 10));

    return { srNumber: sr, date, classLabel, entries, recentDates };
  }

  /* ─── TIMETABLE ─── */

  async timetable(sr: number, allowedSrs: number[]): Promise<ParentTimetableResponse> {
    this.ensureScope(sr, allowedSrs);
    const sessionCode = await this.currentSessionCode();

    const student = await this.db.student.findUnique({
      where: { srNumber: sr },
      select: { class: true, section: true },
    });
    const classSlug = student?.class ?? "";
    const sectionCode = student?.section ?? "";

    const periods = await this.db.timetable_periods.findMany({
      where: { session_code: sessionCode },
      orderBy: [{ sort_order: "asc" }, { period_no: "asc" }],
    });
    const cells = await this.db.timetable_entries.findMany({
      where: { session_code: sessionCode, class_slug: classSlug, section_code: sectionCode },
      include: {
        exam_subjects_timetable_entries_subject_idToexam_subjects: { select: { name: true, short_code: true } },
        users_timetable_entries_teacher_user_idTousers: { select: { name: true } },
      },
    });
    return {
      srNumber: sr,
      classLabel: `${classSlug}-${sectionCode}`,
      sessionCode,
      periods: periods.map((p) => ({
        id: p.id,
        periodNo: p.period_no,
        name: p.name,
        startTime: toHMS(p.start_time),
        endTime: toHMS(p.end_time),
        isBreak: p.is_break,
      })),
      cells: cells.map((c) => ({
        dayOfWeek: c.day_of_week,
        periodId: c.period_id,
        subjectName: c.exam_subjects_timetable_entries_subject_idToexam_subjects?.name ?? null,
        subjectCode: c.exam_subjects_timetable_entries_subject_idToexam_subjects?.short_code ?? null,
        teacherName: c.users_timetable_entries_teacher_user_idTousers?.name ?? null,
        room: c.room ?? null,
      })),
    };
  }

  /* ─── CONTACT ─── */

  async contact(sr: number, allowedSrs: number[]): Promise<ParentContactResponse> {
    this.ensureScope(sr, allowedSrs);
    const sessionCode = await this.currentSessionCode();

    const student = await this.db.student.findUnique({
      where: { srNumber: sr },
      select: { class: true, section: true },
    });
    const classSlug   = student?.class   ?? "";
    const sectionCode = student?.section ?? "";

    // Subject teachers (from this section's timetable)
    const cells = await this.db.timetable_entries.findMany({
      where: { session_code: sessionCode, class_slug: classSlug, section_code: sectionCode, teacher_user_id: { not: null } },
      include: {
        users_timetable_entries_teacher_user_idTousers: {
          select: {
            id: true, name: true, designation: true,
            phone: true, whatsapp: true,
            // staff schedule fields, if present:
          },
        },
        exam_subjects_timetable_entries_subject_idToexam_subjects: { select: { name: true } },
      },
    });
    const teacherMap = new Map<number, ParentContactStaff>();
    for (const c of cells) {
      const u = c.users_timetable_entries_teacher_user_idTousers;
      if (!u) continue;
      const existing = teacherMap.get(u.id);
      const subj = c.exam_subjects_timetable_entries_subject_idToexam_subjects?.name;
      if (existing) {
        if (subj && !existing.subjects?.includes(subj)) existing.subjects?.push(subj);
      } else {
        teacherMap.set(u.id, {
          id: u.id,
          roleLabel: "Subject Teacher",
          name: u.name,
          designation: u.designation ?? null,
          phone: u.phone ?? null,
          whatsapp: u.whatsapp ?? null,
          callStart: null,
          callEnd: null,
          subjects: subj ? [subj] : [],
          isClassTeacher: false,
        });
      }
    }
    // Mark the section's class teacher
    const section = await this.db.sections.findFirst({
      where: { code: sectionCode, classes: { slug: classSlug } },
      select: { teacher_user_id: true },
    });
    if (section?.teacher_user_id) {
      const t = teacherMap.get(section.teacher_user_id);
      if (t) { t.isClassTeacher = true; t.roleLabel = "Class Teacher"; }
    }

    // School-chain staff — pick first user per role we care about.
    const roleSlugs = ["reception", "coordinator", "principal", "vice_principal", "head", "accountant", "hostel_warden", "counsellor"];
    const chainUsers = await this.db.user.findMany({
      where: { status: "active", role: { slug: { in: roleSlugs } } },
      select: {
        id: true, name: true, designation: true, phone: true, whatsapp: true,
        role: { select: { slug: true, name: true } },
      },
      orderBy: { name: "asc" },
    });
    const chain: ParentContactStaff[] = chainUsers.map((u) => ({
      id: u.id,
      roleLabel: u.role?.name ?? u.designation ?? "Staff",
      name: u.name,
      designation: u.designation ?? null,
      phone: u.phone ?? null,
      whatsapp: u.whatsapp ?? null,
      callStart: null,
      callEnd: null,
    }));

    return {
      srNumber: sr,
      classLabel: `${classSlug}-${sectionCode}`,
      subjectTeachers: Array.from(teacherMap.values()),
      schoolChain: chain,
    };
  }

  /* ─── MORE ─── */

  async moreInfo(): Promise<ParentMoreInfo> {
    const rows = await this.db.$queryRawUnsafe<{ k: string; v: string }[]>(
      "SELECT k, v FROM school_info",
    );
    const m = new Map(rows.map((r) => [r.k, r.v]));
    return {
      schoolName: m.get("School Name") || "School",
      address: m.get("Address") || null,
      officeHours: m.get("Office Hours") || "Mon–Fri 8 AM – 4 PM · Sat till 1 PM",
      affiliation: m.get("Affiliation") || null,
      mapsLink: m.get("Google Maps Link") || null,
    };
  }
}

function gradeFromPct(pct: number): string {
  if (pct >= 90) return "A1";
  if (pct >= 80) return "A2";
  if (pct >= 70) return "B1";
  if (pct >= 60) return "B2";
  if (pct >= 50) return "C1";
  if (pct >= 40) return "C2";
  if (pct >= 33) return "D";
  return "E";
}

function toHMS(d: Date): string {
  return d.toISOString().slice(11, 19);
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
