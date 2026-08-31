import { Request, Response } from "express";
import {
  createListingSchema,
  updateListingSchema,
} from "../schemas/listing.schema.js";
import * as listingService from "../services/listing.service.js";
import { ensureOwner } from "../services/user.service.js";

export async function getAll(req: Request, res: Response) {
  const listings = await listingService.getAllListings();
  res.json({ listings });
}

export async function getById(req: Request, res: Response) {
  const listing = await listingService.getListingById(req.params.id);
  res.json({ listing });
}

export async function create(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = createListingSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  await ensureOwner(req.user.id);
  const listingId = await listingService.createListing(
    req.user.id,
    result.data,
  );
  res.status(201).json({ message: "listing created successfully", listingId });
}

export async function update(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = updateListingSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  await listingService.updateListing(req.params.id, req.user.id, result.data);
  res.json({ message: "listing updated successfully" });
}

export async function remove(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  await listingService.deleteListing(req.params.id, req.user.id);
  res.json({ message: "deleted successfully" });
}
