import { Request, Response } from "express";
import {
  createListingSchema,
  updateListingSchema,
} from "../schemas/listing.schema.js";
import * as listingService from "../services/listing.service.js";
import * as searchService from "../services/search/index.js";
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

  const bathroom_raw = parseInt(req.query.bathrooms as string, 10);
  const bathrooms = isNaN(bathroom_raw) ? null : bathroom_raw;

  const floor_raw = parseInt(req.query.floor as string, 10);
  const floor = isNaN(floor_raw) ? null : floor_raw;

  const areaId_raw = parseInt(req.query.areaId as string, 10);
  const areaId = isNaN(areaId_raw) ? null : areaId_raw;

  const areaName = (req.query.area as string) || (req.query.areaName as string) || null;

  const maxRent_raw = parseInt(req.query.maxRent as string, 10);
  const maxRent = isNaN(maxRent_raw) ? null : maxRent_raw;

  const limit_raw = parseInt(req.query.limit as string, 10);
  const limit = isNaN(limit_raw) ? undefined : limit_raw;

  const cursor = (req.query.cursor as string) ?? null;

  // Comma-separated amenity names, e.g. ?amenities=Parking,Gym
  const amenitiesRaw = (req.query.amenities as string) ?? "";
  const amenityNames = amenitiesRaw
    ? amenitiesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const result = await searchService.searchListings({
    q,
    bedrooms,
    bathrooms,
    floor,
    areaId,
    areaName,
    maxRent,
    amenityNames,
    limit,
    cursor,
  });
  res.json(result);
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

export async function getTenantsHistory(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const listingId = parseInt(req.params.id as string, 10);
  if (isNaN(listingId) || listingId <= 0) {
    res.status(400).json({ error: "invalid listing id" });
    return;
  }
  const history = await listingService.getListingTenantHistory(req.user.id, listingId);
  res.json(history);
}
