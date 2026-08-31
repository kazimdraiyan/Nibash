import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "name cannot be empty"),
  email: z.string().email("invalid email address"),
  password: z.string().min(6, "password must be at least 6 characters long"),
  phone: z
    .string()
    .refine(
      (val) => val && val.length === 11 && val.startsWith("01"),
      "phone number must be 11 digits and start with 01",
    ),
  nid: z
    .string()
    .refine(
      (val) => [10, 13, 17].includes(val.length),
      "NID must be 10, 13 or 17 digits long",
    ),
});

export const loginSchema = z.object({
  email: z.string().email("invalid email address"),
  password: z.string().min(6, "password must be at least 6 characters long"),
});

export const becomeTenantSchema = z.object({
  monthly_income: z.number().min(1, "monthly income must be greater than 0"),
  emergency_contact: z
    .string()
    .refine(
      (val) => val && val.length === 11 && val.startsWith("01"),
      "emergency contact number must be 11 digits and start with 01",
    ),
});

export const becomeOwnerSchema = z.object({});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BecomeTenantInput = z.infer<typeof becomeTenantSchema>;
export type BecomeOwnerInput = z.infer<typeof becomeOwnerSchema>;
