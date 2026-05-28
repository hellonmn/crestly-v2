import { z } from "zod";

/* ============================================================
   Parent portal auth — fully separate from the admin/staff login.

   Login model (matches erp/parent/login.php):
     - Phone: ANY number registered against the child's record
       (father / mother / WhatsApp / calling / local guardian)
     - DOB: child's date of birth in DDMMYYYY format

   Success unlocks the whole family — siblings sharing the same
   family_id are auto-included so a parent doesn't log in once
   per child.
   ============================================================ */

export const ParentLoginInputSchema = z.object({
  /** 10-13 digits, may include +91 prefix and spaces — normalised server-side. */
  phone: z.string().min(10).max(20),
  /** Child's DOB as 8 digits DDMMYYYY — e.g. "08072008" for 8 July 2008. */
  dob: z.string()
    .transform((s) => s.replace(/\D/g, ""))
    .pipe(z.string().length(8, "Enter the 8-digit date of birth as DDMMYYYY")),
});
export type ParentLoginInput = z.infer<typeof ParentLoginInputSchema>;

/** A child accessible to the logged-in parent session. */
export const ParentKidSchema = z.object({
  srNumber: z.number().int(),
  studentName: z.string(),
  classLabel: z.string(),                 // "6-A"
  dob: z.string().nullable(),             // ISO YYYY-MM-DD
  isHostel: z.boolean(),
});
export type ParentKid = z.infer<typeof ParentKidSchema>;

export const ParentLoginResponseSchema = z.object({
  accessToken: z.string(),
  /** Free-form label for the welcome screen — usually "<phone> · N children". */
  parentLabel: z.string(),
  familyId: z.number().int().nullable(),
  kids: z.array(ParentKidSchema).min(1),
});
export type ParentLoginResponse = z.infer<typeof ParentLoginResponseSchema>;

/* ─────────────────── Per-page response types ─────────────────── */

export const ParentAttendanceMonthSchema = z.object({
  srNumber: z.number().int(),
  month: z.string(),                              // 'YYYY-MM'
  todayStatus: z.string(),                        // present|absent|late|excused|not_marked
  monthSummary: z.object({
    present: z.number().int(),
    absent: z.number().int(),
    late: z.number().int(),
    excused: z.number().int(),
    marked: z.number().int(),
    percent: z.number(),
  }),
  /** day -> status map for the month, 1-indexed. Days with no record are absent from the map. */
  days: z.record(z.string(), z.string()),
  /** Last 7 days as { iso, status } */
  last7: z.array(z.object({ iso: z.string(), status: z.string() })),
});
export type ParentAttendanceMonth = z.infer<typeof ParentAttendanceMonthSchema>;

export const ParentExamsResponseSchema = z.object({
  srNumber: z.number().int(),
  sessionCode: z.string(),
  /** null = no published marksheet yet. */
  overall: z.object({
    weightedPct: z.number(),
    grade: z.string(),
    result: z.string(),
    totalObtained: z.number(),
    totalMax: z.number(),
  }).nullable(),
  subjects: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    shortCode: z.string(),
    finalPct: z.number().nullable(),
    finalGrade: z.string().nullable(),
  })),
  terms: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    shortCode: z.string(),
    weightPercent: z.number(),
    pct: z.number().nullable(),
  })),
});
export type ParentExamsResponse = z.infer<typeof ParentExamsResponseSchema>;

export const ParentFeesResponseSchema = z.object({
  srNumber: z.number().int(),
  sessionCode: z.string(),
  status: z.string(),                              // paid|partial|pending|overdue
  totalCharged: z.number().int(),
  paidAmount: z.number().int(),
  dueAmount: z.number().int(),
  /** Per-head breakdown if available. */
  breakdown: z.array(z.object({
    label: z.string(),
    amount: z.number().int(),
    note: z.string().optional(),
  })),
  payments: z.array(z.object({
    id: z.number().int(),
    receiptNo: z.string(),
    paidOn: z.string(),
    amount: z.number().int(),
    method: z.string(),
    reference: z.string().nullable(),
    recordedBy: z.string().nullable(),
  })),
});
export type ParentFeesResponse = z.infer<typeof ParentFeesResponseSchema>;

export const ParentDiaryEntrySchema = z.object({
  periodName: z.string(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  subjectName: z.string().nullable(),
  subjectCode: z.string().nullable(),
  teacherName: z.string().nullable(),
  topic: z.string().nullable(),
  homework: z.string().nullable(),
});
export const ParentDiaryResponseSchema = z.object({
  srNumber: z.number().int(),
  date: z.string(),                              // 'YYYY-MM-DD'
  classLabel: z.string(),
  entries: z.array(ParentDiaryEntrySchema),
  recentDates: z.array(z.string()),               // last 7 dates with any entry
});
export type ParentDiaryEntry = z.infer<typeof ParentDiaryEntrySchema>;
export type ParentDiaryResponse = z.infer<typeof ParentDiaryResponseSchema>;

export const ParentTimetableCellSchema = z.object({
  dayOfWeek: z.number().int(),                    // 1..6
  periodId: z.number().int(),
  subjectName: z.string().nullable(),
  subjectCode: z.string().nullable(),
  teacherName: z.string().nullable(),
  room: z.string().nullable(),
});
export const ParentTimetableResponseSchema = z.object({
  srNumber: z.number().int(),
  classLabel: z.string(),
  sessionCode: z.string(),
  periods: z.array(z.object({
    id: z.number().int(),
    periodNo: z.number().int(),
    name: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    isBreak: z.boolean(),
  })),
  cells: z.array(ParentTimetableCellSchema),
});
export type ParentTimetableResponse = z.infer<typeof ParentTimetableResponseSchema>;

export const ParentContactStaffSchema = z.object({
  id: z.number().int(),
  roleLabel: z.string(),                          // "Class Teacher", "Principal", etc.
  name: z.string(),
  designation: z.string().nullable(),
  phone: z.string().nullable(),
  whatsapp: z.string().nullable(),
  callStart: z.string().nullable(),
  callEnd: z.string().nullable(),
  subjects: z.array(z.string()).optional(),       // for subject teachers
  isClassTeacher: z.boolean().optional(),
});
export const ParentContactResponseSchema = z.object({
  srNumber: z.number().int(),
  classLabel: z.string(),
  subjectTeachers: z.array(ParentContactStaffSchema),
  schoolChain: z.array(ParentContactStaffSchema),  // reception → principal → etc.
});
export type ParentContactStaff = z.infer<typeof ParentContactStaffSchema>;
export type ParentContactResponse = z.infer<typeof ParentContactResponseSchema>;

export const ParentMoreInfoSchema = z.object({
  schoolName: z.string(),
  address: z.string().nullable(),
  officeHours: z.string().nullable(),
  affiliation: z.string().nullable(),
  mapsLink: z.string().nullable(),
});
export type ParentMoreInfo = z.infer<typeof ParentMoreInfoSchema>;
