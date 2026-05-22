import { z } from "zod";

export const PunchTypeSchema = z.enum(["in", "out"]);
export type PunchType = z.infer<typeof PunchTypeSchema>;

export const GeofenceTypeSchema = z.enum(["school", "pickup"]);
export type GeofenceType = z.infer<typeof GeofenceTypeSchema>;

export const StaffPunchSchema = z.object({
  id: z.number().int(),
  userId: z.number().int(),
  userName: z.string(),
  designation: z.string().nullable(),
  department: z.string().nullable(),
  punchType: PunchTypeSchema,
  punchedAt: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  accuracyM: z.number().int().nullable(),
  distanceM: z.number().int().nullable(),
  geofenceType: GeofenceTypeSchema,
  geofencePickupId: z.number().int().nullable(),
  isOutside: z.boolean(),
  selfiePath: z.string().nullable(),
  notes: z.string().nullable(),
});
export type StaffPunch = z.infer<typeof StaffPunchSchema>;

export const StaffPunchListQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  userId: z.coerce.number().int().optional(),
  punchType: PunchTypeSchema.optional(),
  zone: z.enum(["all", "in", "outside"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
});
export type StaffPunchListQuery = z.infer<typeof StaffPunchListQuerySchema>;

export const StaffPunchListResponseSchema = z.object({
  items: z.array(StaffPunchSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  punchIns: z.number().int(),
  punchOuts: z.number().int(),
  outsideCount: z.number().int(),
});
export type StaffPunchListResponse = z.infer<typeof StaffPunchListResponseSchema>;

export const PunchCreateSchema = z.object({
  punchType: PunchTypeSchema,
  latitude: z.number(),
  longitude: z.number(),
  accuracyM: z.number().int().nullable().optional(),
  notes: z.string().max(255).nullable().optional(),
  /** Base64-encoded JPEG/PNG selfie. Optional in the API but the punch UI requires it. */
  selfieBase64: z.string().nullable().optional(),
});
export type PunchCreateInput = z.infer<typeof PunchCreateSchema>;
