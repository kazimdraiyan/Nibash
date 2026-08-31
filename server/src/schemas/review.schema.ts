import { z } from "zod";

export const createReviewSchema = z.object({
  contract_id: z.number().positive("contract id must be a positive number"),
  rating: z
    .number()
    .int()
    .min(1, "rating must be between 1 and 5")
    .max(5, "rating must be between 1 and 5"),
  description: z
    .string()
    .min(10, "description must be at least 10 characters long")
    .max(500, "description must be at most 500 characters long"),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
