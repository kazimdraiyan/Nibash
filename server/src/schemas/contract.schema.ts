import { z } from "zod";

export const createContractSchema = z.object({
    listing_id: z.number().positive("listing id must be a positive number"),
    tenant_id: z.number().positive("tenant id must be a positive number"),
    start_date: z.string().refine(val => !isNaN(Date.parse(val)), "start date must be a valid date"),
    end_date: z.string().refine(val => !isNaN(Date.parse(val)), "end date must be a valid date"),
    rent: z.number().positive("rent must be a positive number"),
    electricity_bill: z.number().nonnegative("electricity bill must be a non-negative number"),
    water_bill: z.number().nonnegative("water bill must be a non-negative number"),
    service_charge: z.number().nonnegative("service charge must be a non-negative number"),
    pet_allowed: z.boolean(),
    security_deposit: z.number().nonnegative("security deposit must be a non-negative number"),
    monthly_due_date: z.number().int().min(1, "monthly due date must be between 1 and 28").max(28, "monthly due date must be between 1 and 28"),
}).refine(data => new Date(data.start_date) < new Date(data.end_date), {
    message: "end_date must be after start_date",
    path: ["end_date"]
});

export type CreateContractInput = z.infer<typeof createContractSchema>;

export const updateContractSchema = z.object({
    status: z.enum(["signed"], { message: "status must be either signed " })
})

export type UpdateContractInput = z.infer<typeof updateContractSchema>;