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
