import { Request, Response } from "express";
import {
  createListingSchema,
  updateListingSchema,
} from "../schemas/listing.schema.js";
import * as listingService from "../services/listing.service.js";
import * as mediaService from "../services/media.service.js";
import { ensureOwner } from "../services/user.service.js";

export async function getAll(req: Request, res: Response) {
  const listings = await listingService.getAllListings();
  res.json({ listings });
}

export async function getMy(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const owner = req.user.id;
  const listings = await listingService.getMylistings(owner);
  res.json({ listings });
}

export async function search(req: Request, res: Response) {
  const q = (req.query.q as string) ?? null;

  const bedroom_raw = parseInt(req.query.bedrooms as string, 10);
  const bedrooms = isNaN(bedroom_raw) ? null : bedroom_raw;

  const areaId_raw = parseInt(req.query.areaId as string, 10);
  const areaId = isNaN(areaId_raw) ? null : areaId_raw;

  const maxRent_raw = parseInt(req.query.maxRent as string, 10);
  const maxRent = isNaN(maxRent_raw) ? null : maxRent_raw;

  // Comma-separated amenity names, e.g. ?amenities=Parking,Gym
  const amenitiesRaw = (req.query.amenities as string) ?? "";
  const amenityNames = amenitiesRaw
    ? amenitiesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const listings = await listingService.searchListings(
    q,
    bedrooms,
    areaId,
    maxRent,
    amenityNames,
  );
  res.json({ listings });
}


export async function getById(req: Request, res: Response) {
  const listing = await listingService.getListingById(
    req.params.id as string,
    req.user?.id ?? null,
  );
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
  await listingService.updateListing(
    req.params.id as string,
    req.user.id,
    result.data,
  );
  res.json({ message: "listing updated successfully" });
}

export async function remove(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  await listingService.deleteListing(req.params.id as string, req.user.id);
  res.json({ message: "deleted successfully" });
}

export async function uploadMedia(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const files = req.files as Express.Multer.File[];
  if (!files?.length) {
    res.status(400).json({ error: "no files provided" });
    return;
  }
  const mediaIds = await mediaService.uploadListingMedia(
    req.params.id as string,
    req.user.id,
    files,
  );
  res.status(201).json({ message: "media uploaded", mediaIds });
}

export async function getAmenities(_req: Request, res: Response) {
  const amenities = await listingService.getAllAmenities();
  res.json({ amenities });
}

export async function toggleStar(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const starred = await listingService.toggleStar(req.params.id as string, req.user.id);
  res.json({ starred });
}

export async function getStarred(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const listings = await listingService.getStarredListings(req.user.id);
  res.json({ listings });
}

export async function isStarred(req: Request, res: Response) {
  if (!req.user) {
    res.json({ starred: false });
    return;
  }
  const starred = await listingService.isListingStarred(req.params.id as string, req.user.id);
  res.json({ starred });
}
