import { Request, Response } from "express";
import * as documentService from "../services/document.service.js";
import { uploadDocumentSchema } from "../schemas/document.schema.js";

export async function upload(req: Request, res: Response) {
  const { document_type } = uploadDocumentSchema.parse(req.body);
  const files = (req.files as Express.Multer.File[]) ?? [];

  const result = await documentService.uploadListingDocument(
    req.params.id as string,
    req.user!.id,
    document_type,
    files,
  );
  res.status(201).json({ message: "document uploaded", ...result });
}

export async function list(req: Request, res: Response) {
  const documents = await documentService.getListingDocuments(
    req.params.id as string,
    req.user!.id,
  );
  res.json({ documents });
}

export async function verify(req: Request, res: Response) {
  const document = await documentService.verifyDocument(
    req.params.documentId as string,
    req.user!.id,
  );
  res.json({ message: "document verified", document });
}