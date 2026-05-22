import { z } from "zod";

export const FeePaymentStatusSchema = z.enum(["paid", "partial", "pending", "overdue"]);
export type FeePaymentStatus = z.infer<typeof FeePaymentStatusSchema>;

export const FeePaymentMethodSchema = z.enum(["cash", "upi", "bank_transfer", "cheque", "card", "other"]);
export type FeePaymentMethod = z.infer<typeof FeePaymentMethodSchema>;

/** A single row of the fee-ledger list page. */
export const FeeLedgerRowSchema = z.object({
  srNumber: z.number().int(),
  studentName: z.string(),
  class: z.string(),
  section: z.string(),
  fatherName: z.string().nullable(),
  totalThisYear: z.number().int(),
  paidAmount: z.number().int(),
  dueAmount: z.number().int(),
  paymentStatus: FeePaymentStatusSchema,
  siblingDiscountPct: z.number(),
  familyId: z.number().int().nullable(),
});
export type FeeLedgerRow = z.infer<typeof FeeLedgerRowSchema>;

export const FeeLedgerQuerySchema = z.object({
  q: z.string().optional(),
  class: z.string().optional(),
  section: z.string().optional(),
  status: FeePaymentStatusSchema.optional(),
  sessionCode: z.string().optional(),       // defaults to current
  sort: z.enum(["due_desc", "due_asc", "name", "class"]).default("due_desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(100),
});
export type FeeLedgerQuery = z.infer<typeof FeeLedgerQuerySchema>;

export const FeeLedgerResponseSchema = z.object({
  items: z.array(FeeLedgerRowSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  // KPIs across the filter set
  collected: z.number().int(),
  outstanding: z.number().int(),
  overdueCount: z.number().int(),
  fullyPaidCount: z.number().int(),
  sessionTotal: z.number().int(),
  sessionPaid: z.number().int(),
  sessionDue: z.number().int(),
});
export type FeeLedgerResponse = z.infer<typeof FeeLedgerResponseSchema>;

/** Per-student fee detail returned by GET /api/fees/:sr. */
export const StudentFeeDetailSchema = z.object({
  srNumber: z.number().int(),
  studentName: z.string(),
  class: z.string(),
  section: z.string(),
  sessionCode: z.string(),
  admissionStatus: z.enum(["Continuing", "New"]),
  // Breakdown
  tuitionOriginal: z.number().int(),
  tuitionDiscount: z.number().int(),
  tuitionPayable: z.number().int(),
  annualCharges: z.number().int(),
  activityFee: z.number().int(),
  examFee: z.number().int(),
  transportFee: z.number().int(),
  transportSlab: z.string().nullable(),
  // Hostel (may be 0 for day scholars)
  hostelLodging: z.number().int(),
  hostelMess: z.number().int(),
  hostelCommon: z.number().int(),
  hostelOneTime: z.number().int(),
  // One-time joining
  registrationFee: z.number().int(),
  admissionFee: z.number().int(),
  cautionMoney: z.number().int(),
  firstYearExtras: z.number().int(),
  // Totals
  yearlyRecurringTotal: z.number().int(),
  totalThisYear: z.number().int(),
  paidAmount: z.number().int(),
  dueAmount: z.number().int(),
  paymentStatus: FeePaymentStatusSchema,
  quarterlyInstallment: z.number().int(),
  monthlyEmi: z.number().int(),
  siblingDiscountPct: z.number(),
  payments: z.array(z.object({
    id: z.number().int(),
    receiptNo: z.string(),
    amount: z.number().int(),
    paidOn: z.string(),
    method: FeePaymentMethodSchema,
    reference: z.string().nullable(),
    notes: z.string().nullable(),
    recordedBy: z.string().nullable(),
    isVoided: z.boolean(),
    voidedAt: z.string().nullable(),
    voidedReason: z.string().nullable(),
    createdAt: z.string(),
  })),
});
export type StudentFeeDetail = z.infer<typeof StudentFeeDetailSchema>;

export const RecordPaymentSchema = z.object({
  amount: z.number().int().positive(),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: FeePaymentMethodSchema.default("cash"),
  reference: z.string().max(64).nullable().optional(),
  notes: z.string().max(255).nullable().optional(),
});
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;

// --- Fee structure ---

export const FeeStructureRowSchema = z.object({
  class: z.string(),
  tuitionYearly: z.number().int(),
  annualCharges: z.number().int(),
  activityFee: z.number().int(),
  examFee: z.number().int(),
  recurringTotal: z.number().int(),
  registrationFee: z.number().int(),
  admissionFee: z.number().int(),
  cautionMoney: z.number().int(),
  oneTimeTotal: z.number().int(),
  studentCount: z.number().int().nonnegative(),
});
export type FeeStructureRow = z.infer<typeof FeeStructureRowSchema>;

export const FeeStructureUpsertSchema = z.object({
  class: z.string().min(1).max(16),
  tuitionYearly: z.number().int().nonnegative(),
  annualCharges: z.number().int().nonnegative(),
  activityFee: z.number().int().nonnegative(),
  examFee: z.number().int().nonnegative(),
  registrationFee: z.number().int().nonnegative(),
  admissionFee: z.number().int().nonnegative(),
  cautionMoney: z.number().int().nonnegative(),
});
export type FeeStructureUpsert = z.infer<typeof FeeStructureUpsertSchema>;

export const TransportSlabRowSchema = z.object({
  slab: z.string(),
  distanceRange: z.string(),
  minKm: z.number(),
  maxKm: z.number(),
  yearlyFee: z.number().int(),
  quarterlyFee: z.number().int(),
  monthlyFee: z.number().int(),
});
export type TransportSlabRow = z.infer<typeof TransportSlabRowSchema>;
