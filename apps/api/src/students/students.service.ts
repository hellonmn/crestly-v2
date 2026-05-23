import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { RequestPrismaService } from "../prisma/request-prisma.service";
import type {
  Student, StudentListQuery, StudentListResponse, StudentUpsert,
  StudentPaymentStatus,
} from "@crestly/shared";

/**
 * Students list. Mirrors filters from erp/students/index.php:
 *   q (name/father/contact/SR), class, section, gender, status (active|inactive|all),
 *   accom (day|hostel). Page returns the distinct classes/sections so the UI
 *   can populate filter selects without a second roundtrip.
 *
 * Hydration: when listing, we attach the most recent StudentFee row's
 * paymentStatus + dueAmount and the pickup point name so each row matches
 * the PHP table columns 1:1.
 */
@Injectable()
export class StudentsService {
  constructor(private readonly prisma: RequestPrismaService) {}

  async list(query: StudentListQuery): Promise<StudentListResponse> {
    const where: Prisma.StudentWhereInput = {
      ...(query.class && { class: query.class }),
      ...(query.section && { section: query.section }),
      ...(query.gender && { gender: query.gender }),
      // "all" => no status filter at all; default in PHP is "active"
      ...(query.status && query.status !== "all" && { status: query.status }),
      ...(query.accom === "hostel" && { is_hostel: true }),
      ...(query.accom === "day" && { is_hostel: false }),
      ...(query.q && {
        OR: [
          { studentName: { contains: query.q } },
          { fatherName: { contains: query.q } },
          { motherName: { contains: query.q } },
          { fatherContact: { contains: query.q } },
          { motherContact: { contains: query.q } },
          ...(/^\d+$/.test(query.q.trim())
            ? [{ srNumber: { equals: Number(query.q) } } as Prisma.StudentWhereInput]
            : []),
        ],
      }),
    };

    const [total, rows, classes, sections] = await Promise.all([
      this.prisma.db.student.count({ where }),
      this.prisma.db.student.findMany({
        where,
        orderBy: [{ class: "asc" }, { section: "asc" }, { studentName: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { pickupPoint: { select: { name: true } } },
      }),
      // Distinct classes/sections for filter selects, sorted naturally.
      this.prisma.db.student.findMany({
        distinct: ["class"], select: { class: true }, orderBy: { class: "asc" },
      }),
      this.prisma.db.student.findMany({
        distinct: ["section"], select: { section: true }, orderBy: { section: "asc" },
      }),
    ]);

    // Fetch the most-recent fee row per student in the page so the STATUS
    // column matches PHP (which uses the row's payment_status + due_amount).
    const srs = rows.map((r) => r.srNumber);
    const feeRows = srs.length === 0 ? [] : await this.prisma.db.studentFee.findMany({
      where: { srNumber: { in: srs } },
      select: { srNumber: true, paymentStatus: true, dueAmount: true, sessionCode: true },
      orderBy: { sessionCode: "desc" },
    });
    const feeBySr = new Map<number, { paymentStatus: StudentPaymentStatus; dueAmount: number }>();
    for (const f of feeRows) {
      if (feeBySr.has(f.srNumber)) continue; // first occurrence = most recent session
      feeBySr.set(f.srNumber, {
        paymentStatus: f.paymentStatus as StudentPaymentStatus,
        dueAmount: f.dueAmount,
      });
    }

    return {
      items: rows.map((r) => toDto(r, feeBySr.get(r.srNumber))),
      total,
      page: query.page,
      pageSize: query.pageSize,
      classes: classes.map((c) => c.class),
      sections: sections.map((s) => s.section),
    };
  }

  async findOne(srNumber: number): Promise<Student> {
    const row = await this.prisma.db.student.findUnique({
      where: { srNumber },
      include: { pickupPoint: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException(`Student #${srNumber} not found`);
    return toDto(row);
  }

  async create(input: StudentUpsert): Promise<Student> {
    if (!input.srNumber) {
      throw new ConflictException("srNumber is required (admission roll, set by admissions)");
    }
    const exists = await this.prisma.db.student.findUnique({
      where: { srNumber: input.srNumber },
      select: { srNumber: true },
    });
    if (exists) throw new ConflictException(`Student #${input.srNumber} already exists`);

    const row = await this.prisma.db.student.create({ data: fromDto(input) });
    return toDto(row);
  }

  async update(srNumber: number, input: StudentUpsert): Promise<Student> {
    await this.findOne(srNumber); // 404 if missing
    const row = await this.prisma.db.student.update({
      where: { srNumber },
      data: fromDto(input),
    });
    return toDto(row);
  }

  /** Soft-deactivate. The PHP app never hard-deletes student rows. */
  async deactivate(srNumber: number): Promise<Student> {
    const row = await this.prisma.db.student.update({
      where: { srNumber },
      data: { status: "inactive" },
    });
    return toDto(row);
  }

  /**
   * Bulk action used by the sticky bar in the PHP students/index.php page.
   *   activate / deactivate — flip `status`
   *   delete                — hard delete + cascade across child tables
   * Returns the number of affected students.
   */
  async bulk(op: "activate" | "deactivate" | "delete", srs: number[]): Promise<{ affected: number }> {
    const ids = Array.from(new Set(srs.filter((n) => Number.isInteger(n) && n > 0)));
    if (ids.length === 0) return { affected: 0 };

    if (op === "activate" || op === "deactivate") {
      const result = await this.prisma.db.student.updateMany({
        where: { srNumber: { in: ids } },
        data: { status: op === "activate" ? "active" : "inactive" },
      });
      return { affected: result.count };
    }

    // Hard delete + child cascade. Mirrors the PHP transaction.
    const db = this.prisma.db;
    await db.$transaction(async (tx) => {
      const tables: Array<() => Promise<unknown>> = [
        () => tx.attendance.deleteMany({ where: { sr_number: { in: ids } } }).catch(() => null),
        () => tx.exam_co_grades.deleteMany({ where: { sr_number: { in: ids } } }).catch(() => null),
        () => tx.exam_marks.deleteMany({ where: { sr_number: { in: ids } } }).catch(() => null),
        () => tx.fee_payments.deleteMany({ where: { sr_number: { in: ids } } }).catch(() => null),
        () => tx.hostel_allocations.deleteMany({ where: { sr_number: { in: ids } } }).catch(() => null),
        () => tx.student_edit_requests.deleteMany({ where: { sr_number: { in: ids } } }).catch(() => null),
        () => tx.studentFee.deleteMany({ where: { srNumber: { in: ids } } }).catch(() => null),
      ];
      for (const t of tables) await t();
      await tx.student.deleteMany({ where: { srNumber: { in: ids } } });
    });
    return { affected: ids.length };
  }
}

/** Loosened row type so toDto accepts rows that didn't request the include. */
type StudentRow = Prisma.StudentGetPayload<Record<string, never>> & {
  pickupPoint?: { name: string } | null;
};

function toDto(
  r: StudentRow,
  fee?: { paymentStatus: StudentPaymentStatus; dueAmount: number },
): Student {
  return {
    srNumber: r.srNumber,
    studentName: r.studentName,
    fatherName: r.fatherName,
    motherName: r.motherName,
    dob: r.dob ? r.dob.toISOString().slice(0, 10) : null,
    age: r.age,
    gender: r.gender,
    address: r.address,
    class: r.class,
    section: r.section,
    schoolName: r.schoolName,
    board: r.board,
    fatherContact: r.fatherContact,
    motherContact: r.motherContact,
    callingNumber: r.callingNumber,
    whatsappNumber: r.whatsappNumber,
    pickupPointId: r.pickupPointId,
    familyId: r.familyId,
    status: r.status,
    createdAt: (r.createdAt ?? new Date()).toISOString(),
    updatedAt: (r.updatedAt ?? new Date()).toISOString(),
    pickupName: r.pickupPoint?.name ?? r.pickup_point_name ?? null,
    isHostel: r.is_hostel,
    paymentStatus: fee?.paymentStatus ?? null,
    dueAmount: fee?.dueAmount ?? 0,
  };
}

function fromDto(input: StudentUpsert): Prisma.StudentUncheckedCreateInput {
  return {
    srNumber: input.srNumber!,
    studentName: input.studentName,
    fatherName: input.fatherName,
    motherName: input.motherName,
    dob: input.dob ? new Date(input.dob) : null,
    age: input.age,
    gender: input.gender ?? null,
    address: input.address,
    class: input.class,
    section: input.section,
    schoolName: input.schoolName,
    board: input.board,
    fatherContact: input.fatherContact,
    motherContact: input.motherContact,
    callingNumber: input.callingNumber,
    whatsappNumber: input.whatsappNumber,
    pickupPointId: input.pickupPointId,
    familyId: input.familyId,
    status: input.status,
  };
}
