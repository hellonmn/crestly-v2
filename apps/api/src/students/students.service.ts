import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { RequestPrismaService } from "../prisma/request-prisma.service";
import type { Student, StudentListQuery, StudentListResponse, StudentUpsert } from "@crestly/shared";

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: RequestPrismaService) {}

  async list(query: StudentListQuery): Promise<StudentListResponse> {
    const where: Prisma.StudentWhereInput = {
      ...(query.class && { class: query.class }),
      ...(query.section && { section: query.section }),
      ...(query.status && { status: query.status }),
      ...(query.q && {
        OR: [
          { studentName: { contains: query.q } },
          { fatherName: { contains: query.q } },
          { motherName: { contains: query.q } },
          { fatherContact: { contains: query.q } },
          { motherContact: { contains: query.q } },
        ],
      }),
    };

    const [total, rows] = await Promise.all([
      this.prisma.db.student.count({ where }),
      this.prisma.db.student.findMany({
        where,
        orderBy: [{ class: "asc" }, { section: "asc" }, { studentName: "asc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items: rows.map(toDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findOne(srNumber: number): Promise<Student> {
    const row = await this.prisma.db.student.findUnique({ where: { srNumber } });
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
}

type StudentRow = Prisma.StudentGetPayload<Record<string, never>>;

function toDto(r: StudentRow): Student {
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
