import { Request, Response } from "express";
import * as listingService from "../services/listing.service.js";

export async function getUnverified(req: Request, res: Response) {
  const listings = await listingService.getUnverifiedListings();
  res.json({ listings });
}

export async function verify(req: Request, res: Response) {
  const listing = await listingService.verifyListing(req.params.id as string);
  res.json({ message: "listing verified", listing });
}