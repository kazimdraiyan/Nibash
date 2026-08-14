import { z } from "zod";

export const createPaymentSchema = z.object({
    contract_id: z.number().positive("contract id must be a positive number"),
    amount: z.number().positive("amount must be a positive number"),

    payment_method: z.enum(["Cash", "bKash", "SSLCommerz"], { message: "payment method must be either cash, Bkash or SSLCommerz" }),
    bKash_transaction_id: z.string().optional(),
    SSLCommerz_transaction_id: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updatePaymentSchema = z.object({
    status: z.enum(["confirmed", "failed"], { message: "status must be either confirmed or failed" })
});

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;