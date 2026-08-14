import { z } from "zod";
export const applySchema = z.object({
    listingId: z.number().positive("listing id must be a positive number"),
});
export type ApplyInput = z.infer<typeof applySchema>;

export const updateApplicationSchema = z.object({
    status: z.enum(["rejected"], { message: "status must be rejected" })
});
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;