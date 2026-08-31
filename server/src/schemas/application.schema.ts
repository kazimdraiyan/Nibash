import { z } from "zod";

export const applySchema = z.object({
  listingId: z.number().positive("listing id must be a positive number"),
  monthly_income: z
    .number()
    .positive("monthly income must be a positive number")
    .optional(),
  emergency_contact: z
    .string()
    .refine((val) => val.length == 11 && val.startsWith("01"), {
      message: "emergency contact must be a valid bangladeshi number",
    })
    .optional(),
});

export type ApplyInput = z.infer<typeof applySchema>;

export const updateApplicationSchema = z.object({
  status: z.enum(["rejected"], { message: "status must be rejected" }),
});

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
