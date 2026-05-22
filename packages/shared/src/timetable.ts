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
