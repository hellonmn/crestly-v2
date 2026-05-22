import { z } from "zod";

export const WaSettingsSchema = z.object({
  enabled: z.boolean(),
  accessToken: z.string().nullable(),         // masked when returned
  phoneNumberId: z.string().nullable(),
  wabaId: z.string().nullable(),
  apiVersion: z.string().default("v22.0"),
  displayNumber: z.string().nullable(),
  defaultCountry: z.string().default("91"),
});
export type WaSettings = z.infer<typeof WaSettingsSchema>;

export const WaSettingsUpdateSchema = WaSettingsSchema.partial();
export type WaSettingsUpdate = z.infer<typeof WaSettingsUpdateSchema>;

export const WaTemplateSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  language: z.string(),
  category: z.string().nullable(),
  status: z.string().nullable(),
  bodyText: z.string().nullable(),
  headerText: z.string().nullable(),
  footerText: z.string().nullable(),
  variableCount: z.number().int(),
  metaId: z.string().nullable(),
  fetchedAt: z.string().nullable(),
});
export type WaTemplate = z.infer<typeof WaTemplateSchema>;

export const WaActionBindingSchema = z.object({
  actionKey: z.string(),
  templateName: z.string(),
  templateLang: z.string(),
  recipientField: z.string().nullable(),
  variableMap: z.record(z.string(), z.unknown()),
  isEnabled: z.boolean(),
});
export type WaActionBinding = z.infer<typeof WaActionBindingSchema>;

export const WaBindingUpsertSchema = z.object({
  actionKey: z.string().min(1).max(80),
  templateName: z.string().min(1).max(120),
  templateLang: z.string().default("en"),
  recipientField: z.string().nullable().optional(),
  variableMap: z.record(z.string(), z.unknown()).default({}),
  isEnabled: z.boolean().default(true),
});
export type WaBindingUpsertInput = z.infer<typeof WaBindingUpsertSchema>;

export const WaTestInputSchema = z.object({
  toPhone: z.string().min(10).max(20),
});
export type WaTestInput = z.infer<typeof WaTestInputSchema>;

export const WaLogEntrySchema = z.object({
  id: z.number().int(),
  actionKey: z.string().nullable(),
  templateName: z.string().nullable(),
  toPhone: z.string(),
  status: z.enum(["queued", "sent", "failed"]),
  metaMessageId: z.string().nullable(),
  errorMessage: z.string().nullable(),
  variables: z.record(z.string(), z.unknown()),
  context: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
});
export type WaLogEntry = z.infer<typeof WaLogEntrySchema>;

/** Action keys that the app can dispatch. Mirrors the PHP catalog. */
export const WA_ACTIONS = [
  "fee.payment.received",
  "fee.reminder",
  "voucher.pending_approval",
  "voucher.paid",
  "student.absent",
  "salary.paid",
] as const;
export type WaActionKey = (typeof WA_ACTIONS)[number];
