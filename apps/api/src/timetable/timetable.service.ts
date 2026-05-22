import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { RequestPrismaService } from "../prisma/request-prisma.service";
import { SessionsService } from "../sessions/sessions.service";
import type {
  TimetableCell,
  TimetableCellUpsert,
  TimetableGridQuery,
  TimetableGridResponse,
  TimetablePeriod,
  TimetablePeriodUpsert,
  WorkloadRow,
} from "@crestly/shared";

@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: RequestPrismaService,
    private readonly sessions: SessionsService,
  ) {}

  async periods(): Promise<TimetablePeriod[]> {
    const session = await this.sessions.current();
    const rows = await this.prisma.db.timetable_periods.findMany({
      where: { session_code: session.code },
      orderBy: [{ sort_order: "asc" }, { period_no: "asc" }],
    });
    return rows.map((p) => ({
      id: p.id,
      periodNo: p.period_no,
      name: p.name,
      startTime: timeStr(p.start_time),
      endTime: timeStr(p.end_time),
      isBreak: p.is_break,
      sortOrder: p.sort_order,
    }));
  }

  async upsertPeriod(input: TimetablePeriodUpsert, id?: number): Promise<TimetablePeriod> {
    const session = await this.sessions.current();
    const start = new Date(`1970-01-01T${normaliseTime(input.startTime)}Z`);
    const end = new Date(`1970-01-01T${normaliseTime(input.endTime)}Z`);
    const row = id
      ? await this.prisma.db.timetable_periods.update({
          where: { id },
          data: {
            period_no: input.periodNo, name: input.name,
            start_time: start, end_time: end,
            is_break: input.isBreak, sort_order: input.sortOrder,
          },
        })
      : await this.prisma.db.timetable_periods.create({
          data: {
            session_code: session.code, period_no: input.periodNo, name: input.name,
            start_time: start, end_time: end,
            is_break: input.isBreak, sort_order: input.sortOrder,
          },
        });
    return {
      id: row.id, periodNo: row.period_no, name: row.name,
      startTime: timeStr(row.start_time), endTime: timeStr(row.end_time),
      isBreak: row.is_break, sortOrder: row.sort_order,
    };
  }

  async deletePeriod(id: number): Promise<{ ok: true }> {
    await this.prisma.db.timetable_periods.delete({ where: { id } });
    return { ok: true };
  }

  async grid(query: TimetableGridQuery): Promise<TimetableGridResponse> {
    const sessionCode = query.sessionCode ?? (await this.sessions.current()).code;
    const periods = await this.periods();

    let where: Prisma.timetable_entriesWhereInput;
    let scope: "section" | "teacher";
    let scopeLabel: string;

    if (query.teacherUserId) {
      where = { session_code: sessionCode };
      // Either primary or parallel teacher matches.
      where.OR = [
        { teacher_user_id: query.teacherUserId },
        { teacher_user_id2: query.teacherUserId },
      ];
      scope = "teacher";
      const teacher = await this.prisma.db.user.findUnique({
        where: { id: query.teacherUserId },
        select: { name: true },
      });
      scopeLabel = teacher?.name ?? `User #${query.teacherUserId}`;
    } else if (query.class && query.section) {
      where = {
        session_code: sessionCode,
        class_slug: query.class,
        section_code: query.section,
      };
      scope = "section";
      scopeLabel = `${query.class}-${query.section}`;
    } else {
      throw new BadRequestException("Provide either teacherUserId or both class+section");
    }

    const cells = await this.prisma.db.timetable_entries.findMany({
      where,
      include: {
        exam_subjects_timetable_entries_subject_idToexam_subjects: { select: { id: true, name: true } },
        users_timetable_entries_teacher_user_idTousers: { select: { id: true, name: true } },
        exam_subjects_timetable_entries_subject_id2Toexam_subjects: { select: { id: true, name: true } },
        users_timetable_entries_teacher_user_id2Tousers: { select: { id: true, name: true } },
      },
    });

    const cellsDto: TimetableCell[] = cells.map((c) => ({
      id: c.id,
      dayOfWeek: c.day_of_week,
      periodId: c.period_id,
      classSlug: c.class_slug,
      sectionCode: c.section_code,
      subjectId: c.subject_id,
      subjectName: c.exam_subjects_timetable_entries_subject_idToexam_subjects?.name ?? null,
      teacherUserId: c.teacher_user_id,
      teacherName: c.users_timetable_entries_teacher_user_idTousers?.name ?? null,
      subjectId2: c.subject_id2,
      subjectName2: c.exam_subjects_timetable_entries_subject_id2Toexam_subjects?.name ?? null,
      teacherUserId2: c.teacher_user_id2,
      teacherName2: c.users_timetable_entries_teacher_user_id2Tousers?.name ?? null,
      room: c.room,
      notes: c.notes,
    }));

    return { sessionCode, scope, scopeLabel, periods, cells: cellsDto };
  }

  async upsertCell(input: TimetableCellUpsert): Promise<TimetableCell> {
    const session = await this.sessions.current();
    const existing = await this.prisma.db.timetable_entries.findFirst({
      where: {
        session_code: session.code,
        class_slug: input.classSlug,
        section_code: input.sectionCode,
        day_of_week: input.dayOfWeek,
        period_id: input.periodId,
      },
    });
    if (existing) {
      await this.prisma.db.timetable_entries.update({
        where: { id: existing.id },
        data: {
          subject_id: input.subjectId,
          teacher_user_id: input.teacherUserId,
          subject_id2: input.subjectId2 ?? null,
          teacher_user_id2: input.teacherUserId2 ?? null,
          room: input.room ?? null,
          notes: input.notes ?? null,
        },
      });
    } else {
      await this.prisma.db.timetable_entries.create({
        data: {
          session_code: session.code,
          class_slug: input.classSlug,
          section_code: input.sectionCode,
          day_of_week: input.dayOfWeek,
          period_id: input.periodId,
          subject_id: input.subjectId,
          teacher_user_id: input.teacherUserId,
          subject_id2: input.subjectId2 ?? null,
          teacher_user_id2: input.teacherUserId2 ?? null,
          room: input.room ?? null,
          notes: input.notes ?? null,
        },
      });
    }
    const grid = await this.grid({
      class: input.classSlug,
      section: input.sectionCode,
      sessionCode: session.code,
    });
    const cell = grid.cells.find(
      (c) => c.dayOfWeek === input.dayOfWeek && c.periodId === input.periodId,
    );
    if (!cell) throw new NotFoundException("Cell saved but reload failed");
    return cell;
  }

  async deleteCell(id: number): Promise<{ ok: true }> {
    await this.prisma.db.timetable_entries.delete({ where: { id } });
    return { ok: true };
  }

  async workload(): Promise<WorkloadRow[]> {
    const session = await this.sessions.current();

    // Capacity = number of non-break periods × 6 working days.
    const periods = await this.prisma.db.timetable_periods.count({
      where: { session_code: session.code, is_break: false },
    });
    const capacity = periods * 6;

    const teachers = await this.prisma.db.user.findMany({
      where: { status: "active" },
      select: { id: true, name: true, designation: true, department: true },
      orderBy: { name: "asc" },
    });

    // Primary-teacher counts.
    const primary = await this.prisma.db.timetable_entries.groupBy({
      by: ["teacher_user_id"],
      where: { session_code: session.code, teacher_user_id: { not: null } },
      _count: { _all: true },
    });
    const parallel = await this.prisma.db.timetable_entries.groupBy({
      by: ["teacher_user_id2"],
      where: { session_code: session.code, teacher_user_id2: { not: null } },
      _count: { _all: true },
    });
    const counts = new Map<number, number>();
    for (const r of primary) if (r.teacher_user_id) counts.set(r.teacher_user_id, (counts.get(r.teacher_user_id) ?? 0) + r._count._all);
    for (const r of parallel) if (r.teacher_user_id2) counts.set(r.teacher_user_id2, (counts.get(r.teacher_user_id2) ?? 0) + r._count._all);

    // Section reach per teacher.
    const sections = await this.prisma.db.timetable_entries.findMany({
      where: { session_code: session.code, teacher_user_id: { not: null } },
      select: { teacher_user_id: true, class_slug: true, section_code: true },
    });
    const sectionsByTeacher = new Map<number, Set<string>>();
    for (const s of sections) {
      if (!s.teacher_user_id) continue;
      const set = sectionsByTeacher.get(s.teacher_user_id) ?? new Set();
      set.add(`${s.class_slug}-${s.section_code}`);
      sectionsByTeacher.set(s.teacher_user_id, set);
    }

    return teachers.map((t) => {
      const assigned = counts.get(t.id) ?? 0;
      return {
        userId: t.id,
        name: t.name,
        designation: t.designation,
        department: t.department,
        assignedSlots: assigned,
        capacitySlots: capacity,
        sectionsCount: sectionsByTeacher.get(t.id)?.size ?? 0,
        utilizationPct: capacity > 0 ? Math.round((assigned / capacity) * 100) : 0,
      };
    });
  }
}

function timeStr(t: Date): string {
  return t.toISOString().slice(11, 19); // 'HH:MM:SS'
}
function normaliseTime(s: string): string {
  return s.length === 5 ? `${s}:00` : s;
}
