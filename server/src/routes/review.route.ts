import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as reviewController from "../controllers/review.controller.js";

const router = Router();

router.post("/", authMiddleware, asyncHandler(reviewController.create));
router.get(
  "/listings/:listing_id",
  asyncHandler(reviewController.getForListing),
);

export default router;
