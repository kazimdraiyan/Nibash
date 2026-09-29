import { z } from "zod";

export const createReviewSchema = z.object({
  contract_id: z.coerce.number().positive("contract id must be a positive number"),
  rating: z.coerce
    .number()
    .int()
    .min(1, "rating must be between 1 and 5")
    .max(5, "rating must be between 1 and 5"),
  description: z
    .string()
    .max(1000, "description must be at most 1000 characters long")
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z.object({
  rating: z.coerce
    .number()
    .int()
    .min(1, "rating must be between 1 and 5")
    .max(5, "rating must be between 1 and 5")
    .optional(),
  description: z
    .string()
    .max(1000, "description must be at most 1000 characters long")
    .optional()
    .nullable()
    .transform((val) => (val !== undefined ? (val && val.trim().length > 0 ? val.trim() : null) : undefined)),
  keep_media_ids: z
    .union([z.array(z.coerce.number()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val;
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed.map(Number) : undefined;
      } catch {
        return val.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n));
      }
    }),
});

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
