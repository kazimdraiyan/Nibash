import { Request, Response } from "express";
import { createReviewSchema } from "../schemas/review.schema.js";
import * as reviewService from "../services/review.service.js";

export async function create(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = createReviewSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  await reviewService.createReview(req.user.id, result.data);
  res.json({ message: "review posted successfully" });
}

export async function getForListing(req: Request, res: Response) {
  const reviews = await reviewService.getReviewsForListing(
    req.params.listing_id,
  );
  res.json({ reviews });
}
