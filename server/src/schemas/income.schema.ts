import { z } from "zod";

export const incomePeriodEnum = z.enum([
  "all",
  "this_month",
  "last_month",
  "last_3_months",
  "last_6_months",
  "custom",
]);

export const incomeQuerySchema = z.object({
  period: incomePeriodEnum.default("all"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "from must be in YYYY-MM-DD format")
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "to must be in YYYY-MM-DD format")
    .optional(),
  listing_id: z.coerce.number().int().positive().optional(),
  contract_id: z.coerce.number().int().positive().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .transform((val) => (val < 1 ? 1 : val))
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .transform((val) => (val < 1 ? 15 : val > 50 ? 50 : val))
    .default(15),
});

export type IncomeQueryParams = z.infer<typeof incomeQuerySchema>;
export type PaginationParams = z.infer<typeof paginationSchema>;
