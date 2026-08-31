import { Request, Response } from "express";
import {
  applySchema,
  updateApplicationSchema,
} from "../schemas/application.schema.js";
import * as applicationService from "../services/application.service.js";
import { ensureTenant } from "../services/user.service.js";

export async function apply(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = applySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { listingId, monthly_income, emergency_contact } = result.data;
  await ensureTenant(req.user.id, monthly_income, emergency_contact);
  await applicationService.applyToListing(req.user.id, listingId);
  res.json({ message: "applied successfully" });
}

export async function getAll(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const applications = await applicationService.getAllApplications(req.user.id);
  res.json({ applications });
}

export async function getForListing(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const applications = await applicationService.getApplicationsForListing(
    req.user.id,
    req.params.listingId,
  );
  res.json({ applications });
}

export async function reject(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = updateApplicationSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  await applicationService.rejectApplication(
    req.user.id,
    req.params.listingId,
    req.params.tenantId,
  );
  res.json({ message: "application rejected" });
}
