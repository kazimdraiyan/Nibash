import { Request, Response } from "express";
import { createReviewSchema, updateReviewSchema } from "../schemas/review.schema.js";
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
  const files = (req.files as Express.Multer.File[]) || [];
  const review = await reviewService.createReview(req.user.id, result.data, files);
  res.status(201).json({ message: "review posted successfully", review });
}

export async function getForContract(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const review = await reviewService.getReviewForContract(
    req.params.contract_id as string
  );
  res.json({ review });
}

export async function update(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = updateReviewSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const files = (req.files as Express.Multer.File[]) || [];
  const review = await reviewService.updateReview(
    req.user.id,
    req.params.id as string,
    result.data,
    files
  );
  res.json({ message: "review updated successfully", review });
}

export async function remove(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const result = await reviewService.deleteReview(
    req.user.id,
    req.params.id as string
  );
  res.json(result);
}

export async function getForListing(req: Request, res: Response) {
  const data = await reviewService.getReviewsForListing(
    req.params.listing_id as string
  );
  res.json(data);
}
