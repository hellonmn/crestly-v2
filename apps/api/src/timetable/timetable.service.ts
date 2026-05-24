import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { RequestPrismaService } from "../prisma/request-prisma.service";
import { SessionsService } from "../sessions/sessions.service";
import type {
  TimetableCell,
  TimetableCellUpsert,
  TimetableGridQuery,
  TimetableGridResponse,
  TimetableMasterCell,
  TimetableMasterCellDelete,
  TimetableMasterCellWrite,
  TimetableMasterResponse,
  TimetableMasterSection,
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

  /* ============================================================
     Master grid — single view across every section, where each
     cell collapses days 1..6 into one. Used by schools whose
     timetable is the same every day Mon–Sat.
     ============================================================ */

  async master(): Promise<TimetableMasterResponse> {
    const session = await this.sessions.current();
    const periods = await this.periods();

    // Sections come from the classes/sections tables — these are the
    // columns of the master grid, in their canonical order.
    const classes = await this.prisma.db.classes.findMany({
      orderBy: [{ sort_order: "asc" }, { id: "asc" }],
      include: {
        sections: { orderBy: { code: "asc" } },
      },
    });

    const sections: TimetableMasterSection[] = [];
    for (const cls of classes) {
      for (const s of cls.sections) {
        sections.push({
          classSlug: cls.slug,
          sectionCode: s.code,
          label: `${cls.slug}-${s.code}`,
          classSortOrder: cls.sort_order,
        });
      }
    }

    // Pull every cell for the session — including all 6 day variants —
    // and collapse them per (section, period).
    const allCells = await this.prisma.db.timetable_entries.findMany({
      where: { session_code: session.code },
      include: {
        exam_subjects_timetable_entries_subject_idToexam_subjects: { select: { id: true, name: true } },
        users_timetable_entries_teacher_user_idTousers: { select: { id: true, name: true } },
        exam_subjects_timetable_entries_subject_id2Toexam_subjects: { select: { id: true, name: true } },
        users_timetable_entries_teacher_user_id2Tousers: { select: { id: true, name: true } },
      },
    });

    // Group by (classSlug | sectionCode | periodId).
    type Group = typeof allCells;
    const groups = new Map<string, Group>();
    for (const c of allCells) {
      const k = `${c.class_slug}|${c.section_code}|${c.period_id}`;
      const arr = groups.get(k) ?? [];
      arr.push(c);
      groups.set(k, arr);
    }

    function pickFingerprint(row: (typeof allCells)[number]): string {
      return [
        row.subject_id ?? "",
        row.teacher_user_id ?? "",
        row.subject_id2 ?? "",
        row.teacher_user_id2 ?? "",
        row.room ?? "",
        row.notes ?? "",
      ].join("·");
    }

    const cells: TimetableMasterCell[] = [];
    for (const [, rows] of groups) {
      const first = rows[0];
      const fp = pickFingerprint(first);
      const mixed = rows.some((r) => pickFingerprint(r) !== fp);
      cells.push({
        classSlug: first.class_slug,
        sectionCode: first.section_code,
        periodId: first.period_id,
        subjectId: first.subject_id,
        subjectName: first.exam_subjects_timetable_entries_subject_idToexam_subjects?.name ?? null,
        teacherUserId: first.teacher_user_id,
        teacherName: first.users_timetable_entries_teacher_user_idTousers?.name ?? null,
        subjectId2: first.subject_id2,
        subjectName2: first.exam_subjects_timetable_entries_subject_id2Toexam_subjects?.name ?? null,
        teacherUserId2: first.teacher_user_id2,
        teacherName2: first.users_timetable_entries_teacher_user_id2Tousers?.name ?? null,
        room: first.room,
        notes: first.notes,
        mixed,
        daysFilled: rows.length,
      });
    }

    return { sessionCode: session.code, periods, sections, cells };
  }

  /**
   * Write a master cell — fans out the same (subject, teacher, room, notes)
   * to all 6 working days (Mon=1 .. Sat=6) for the given (section, period).
   * Existing entries on those days are overwritten; missing ones are created.
   */
  async upsertMasterCell(input: TimetableMasterCellWrite): Promise<{ ok: true; daysWritten: number }> {
    const session = await this.sessions.current();
    const period = await this.prisma.db.timetable_periods.findUnique({
      where: { id: input.periodId },
    });
    if (!period) throw new NotFoundException("Period not found");
    if (period.is_break) {
      throw new BadRequestException("Cannot assign a cell to a break period");
    }

    const days = [1, 2, 3, 4, 5, 6] as const;
    for (const day of days) {
      const existing = await this.prisma.db.timetable_entries.findFirst({
        where: {
          session_code: session.code,
          class_slug: input.classSlug,
          section_code: input.sectionCode,
          day_of_week: day,
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
            day_of_week: day,
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
    }
    return { ok: true, daysWritten: days.length };
  }

  /** Clear a master cell — deletes all 6 days for (section, period). */
  async deleteMasterCell(input: TimetableMasterCellDelete): Promise<{ ok: true; daysDeleted: number }> {
    const session = await this.sessions.current();
    const res = await this.prisma.db.timetable_entries.deleteMany({
      where: {
        session_code: session.code,
        class_slug: input.classSlug,
        section_code: input.sectionCode,
        period_id: input.periodId,
      },
    });
    return { ok: true, daysDeleted: res.count };
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
