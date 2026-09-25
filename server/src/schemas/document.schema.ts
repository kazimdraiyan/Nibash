import { z } from "zod";

export const documentTypeEnum = z.enum([
  "electricity_bill_receipt",
  "holding_tax_receipt",
  "water_bill_receipt",
  "trade_license",
  "nid",
  "passport",
  "driving_license",
]);

export const uploadDocumentSchema = z.object({
  document_type: documentTypeEnum,
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;