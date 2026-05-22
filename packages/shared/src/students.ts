import { z } from "zod";

/**
 * Convention: Zod schemas are exported with a `Schema` suffix; the inferred
 * type keeps the clean name. See packages/shared/src/auth.ts for rationale.
 */

export const GenderSchema = z.enum(["Male", "Female", "Other"]);
export type Gender = z.infer<typeof GenderSchema>;

export const StudentStatusSchema = z.enum(["active", "inactive"]);
export type StudentStatus = z.infer<typeof StudentStatusSchema>;

/**
 * Student row as returned by the API. `srNumber` is the admission roll
 * number and the primary key — no surrogate id.
 */
export const StudentSchema = z.object({
  srNumber: z.number().int().positive(),
  studentName: z.string().min(1).max(120),
  fatherName: z.string().max(120).nullable(),
  motherName: z.string().max(120).nullable(),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  age: z.number().int().min(0).max(255).nullable(),
  gender: GenderSchema.nullable(),
  address: z.string().nullable(),
  class: z.string().min(1).max(16),
  section: z.string().min(1).max(8),
  schoolName: z.string().max(120).nullable(),
  board: z.string().max(32).nullable(),
  fatherContact: z.string().max(20).nullable(),
  motherContact: z.string().max(20).nullable(),
  callingNumber: z.string().max(20).nullable(),
  whatsappNumber: z.string().max(20).nullable(),
  pickupPointId: z.number().int().nullable(),
  familyId: z.number().int().nullable(),
  status: StudentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Student = z.infer<typeof StudentSchema>;

export const StudentListQuerySchema = z.object({
  q: z.string().optional(),
  class: z.string().optional(),
  section: z.string().optional(),
  status: StudentStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type StudentListQuery = z.infer<typeof StudentListQuerySchema>;

export const StudentListResponseSchema = z.object({
  items: z.array(StudentSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
});
export type StudentListResponse = z.infer<typeof StudentListResponseSchema>;

export const StudentUpsertSchema = StudentSchema.omit({
  srNumber: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  srNumber: z.number().int().positive().optional(),
});
export type StudentUpsert = z.infer<typeof StudentUpsertSchema>;
