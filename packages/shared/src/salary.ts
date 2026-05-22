import { z } from "zod";

/**
 * Per-user daily salary ledger. Each row = one day; "cut" reflects late /
 * early-out deductions and unmarked days. Mirrors erp/salary/index.php.
 */

export const SalaryDayRowSchema = z.object({
  date: z.string(),
  marked: z.boolean(),
  punchIn: z.string().nullable(),
  punchOut: z.string().nullable(),
  lateMinutes: z.number().int(),
  earlyMinutes: z.number().int(),
  cut: z.number().int(),
  net: z.number().int(),
  isHoliday: z.boolean(),
  isWeekend: z.boolean(),
});
export type SalaryDayRow = z.infer<typeof SalaryDayRowSchema>;

export const SalaryQuerySchema = z.object({
  userId: z.coerce.number().int().optional(),     // omit = self
  month: z.string().regex(/^\d{4}-\d{2}$/),
});
export type SalaryQuery = z.infer<typeof SalaryQuerySchema>;

export const SalaryResponseSchema = z.object({
  userId: z.number().int(),
  userName: z.string(),
  month: z.string(),
  monthlySalary: z.number().int(),
  dailyGross: z.number().int(),
  daysMarked: z.number().int(),
  totalCut: z.number().int(),
  netEarned: z.number().int(),
  paidViaVoucher: z.number().int(),
  due: z.number().int(),
  pendingVouchers: z.number().int(),
  rows: z.array(SalaryDayRowSchema),
});
export type SalaryResponse = z.infer<typeof SalaryResponseSchema>;
