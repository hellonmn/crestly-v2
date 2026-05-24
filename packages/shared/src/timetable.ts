import { z } from "zod";

export const TimetablePeriodSchema = z.object({
  id: z.number().int(),
  periodNo: z.number().int(),
  name: z.string(),
  startTime: z.string(),                // 'HH:MM:SS'
  endTime: z.string(),
  isBreak: z.boolean(),
  sortOrder: z.number().int(),
});
export type TimetablePeriod = z.infer<typeof TimetablePeriodSchema>;

export const TimetablePeriodUpsertSchema = z.object({
  periodNo: z.number().int().min(0).max(20),
  name: z.string().min(1).max(40),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  isBreak: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});
export type TimetablePeriodUpsert = z.infer<typeof TimetablePeriodUpsertSchema>;

/** One filled-in cell of the timetable grid. */
export const TimetableCellSchema = z.object({
  id: z.number().int(),
  dayOfWeek: z.number().int().min(1).max(7),
  periodId: z.number().int(),
  classSlug: z.string(),
  sectionCode: z.string(),
  subjectId: z.number().int().nullable(),
  subjectName: z.string().nullable(),
  teacherUserId: z.number().int().nullable(),
  teacherName: z.string().nullable(),
  subjectId2: z.number().int().nullable(),
  subjectName2: z.string().nullable(),
  teacherUserId2: z.number().int().nullable(),
  teacherName2: z.string().nullable(),
  room: z.string().nullable(),
  notes: z.string().nullable(),
});
export type TimetableCell = z.infer<typeof TimetableCellSchema>;

export const TimetableGridQuerySchema = z.object({
  /** Pick one: by section OR by teacher. */
  class: z.string().optional(),
  section: z.string().optional(),
  teacherUserId: z.coerce.number().int().optional(),
  sessionCode: z.string().optional(),
});
export type TimetableGridQuery = z.infer<typeof TimetableGridQuerySchema>;

export const TimetableGridResponseSchema = z.object({
  sessionCode: z.string(),
  scope: z.enum(["section", "teacher"]),
  scopeLabel: z.string(),
  periods: z.array(TimetablePeriodSchema),
  cells: z.array(TimetableCellSchema),
});
export type TimetableGridResponse = z.infer<typeof TimetableGridResponseSchema>;

export const TimetableCellUpsertSchema = z.object({
  classSlug: z.string().min(1),
  sectionCode: z.string().min(1),
  dayOfWeek: z.number().int().min(1).max(7),
  periodId: z.number().int().positive(),
  subjectId: z.number().int().nullable(),
  teacherUserId: z.number().int().nullable(),
  subjectId2: z.number().int().nullable().optional(),
  teacherUserId2: z.number().int().nullable().optional(),
  room: z.string().max(40).nullable().optional(),
  notes: z.string().max(120).nullable().optional(),
});
export type TimetableCellUpsert = z.infer<typeof TimetableCellUpsertSchema>;

/* ============================================================
   Master grid — for schools where the timetable is the same
   every day Mon–Sat. One cell per (section, period); writing
   to it fans out the same subject+teacher to all 6 days.
   ============================================================ */

export const TimetableMasterSectionSchema = z.object({
  classSlug: z.string(),
  sectionCode: z.string(),
  label: z.string(),              // e.g. "6-A"
  classSortOrder: z.number().int(),
});
export type TimetableMasterSection = z.infer<typeof TimetableMasterSectionSchema>;

/** Aggregated view of one section×period — collapses 6 days into one. */
export const TimetableMasterCellSchema = z.object({
  classSlug: z.string(),
  sectionCode: z.string(),
  periodId: z.number().int(),
  subjectId: z.number().int().nullable(),
  subjectName: z.string().nullable(),
  teacherUserId: z.number().int().nullable(),
  teacherName: z.string().nullable(),
  subjectId2: z.number().int().nullable(),
  subjectName2: z.string().nullable(),
  teacherUserId2: z.number().int().nullable(),
  teacherName2: z.string().nullable(),
  room: z.string().nullable(),
  notes: z.string().nullable(),
  /** True when at least one day's cell differs from the others. */
  mixed: z.boolean(),
  /** How many of the 6 days have a cell here. */
  daysFilled: z.number().int().min(0).max(7),
});
export type TimetableMasterCell = z.infer<typeof TimetableMasterCellSchema>;

export const TimetableMasterResponseSchema = z.object({
  sessionCode: z.string(),
  periods: z.array(TimetablePeriodSchema),
  sections: z.array(TimetableMasterSectionSchema),
  cells: z.array(TimetableMasterCellSchema),
});
export type TimetableMasterResponse = z.infer<typeof TimetableMasterResponseSchema>;

/** Write a master cell — server fans it out to days 1..6. */
export const TimetableMasterCellWriteSchema = z.object({
  classSlug: z.string().min(1),
  sectionCode: z.string().min(1),
  periodId: z.number().int().positive(),
  subjectId: z.number().int().nullable(),
  teacherUserId: z.number().int().nullable(),
  subjectId2: z.number().int().nullable().optional(),
  teacherUserId2: z.number().int().nullable().optional(),
  room: z.string().max(40).nullable().optional(),
  notes: z.string().max(120).nullable().optional(),
});
export type TimetableMasterCellWrite = z.infer<typeof TimetableMasterCellWriteSchema>;

export const TimetableMasterCellDeleteSchema = z.object({
  classSlug: z.string().min(1),
  sectionCode: z.string().min(1),
  periodId: z.number().int().positive(),
});
export type TimetableMasterCellDelete = z.infer<typeof TimetableMasterCellDeleteSchema>;

export const WorkloadRowSchema = z.object({
  userId: z.number().int(),
  name: z.string(),
  designation: z.string().nullable(),
  department: z.string().nullable(),
  assignedSlots: z.number().int(),
  capacitySlots: z.number().int(),
  sectionsCount: z.number().int(),
  utilizationPct: z.number(),
});
export type WorkloadRow = z.infer<typeof WorkloadRowSchema>;
