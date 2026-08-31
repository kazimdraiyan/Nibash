import { z } from "zod";

export const createListingSchema = z.object({
  title: z.string().min(1, "title cannot be empty"),
  bedroom_count: z.number().positive("bedroom count must be a positive number"),
  bathroom_count: z
    .number()
    .positive("bathroom count must be a positive number"),
  on_which_floor: z
    .number()
    .nonnegative("on which floor must be a non-negative number"),
  area_id: z.number().positive("area id must be a positive number"),
  latitude: z
    .number()
    .min(-90, "latitude must be between -90 and 90")
    .max(90, "latitude must be between -90 and 90"),
  longitude: z
    .number()
    .min(-180, "longitude must be between -180 and 180")
    .max(180, "longitude must be between -180 and 180"),
  description: z.string().min(1, "description cannot be empty"),
  rent: z.number().positive("rent must be a positive number"),
  electricity_bill: z
    .number()
    .nonnegative("electricity bill must be a non-negative number"),
  water_bill: z
    .number()
    .nonnegative("water bill must be a non-negative number"),
  service_charge: z
    .number()
    .nonnegative("service charge must be a non-negative number"),
  monthly_due_date: z
    .number()
    .int()
    .min(1, "monthly due date must be between 1 and 28")
    .max(28, "monthly due date must be between 1 and 28"),
  pet_allowed: z.boolean(),
  security_deposit: z
    .number()
    .nonnegative("security deposit must be a non-negative number"),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export const updateListingSchema = createListingSchema.partial();
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
