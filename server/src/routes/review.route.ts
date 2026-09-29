import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as reviewController from "../controllers/review.controller.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  upload.array("images", 5),
  asyncHandler(reviewController.create)
);

router.get(
  "/contract/:contract_id",
  authMiddleware,
  asyncHandler(reviewController.getForContract)
);

router.patch(
  "/:id",
  authMiddleware,
  upload.array("images", 5),
  asyncHandler(reviewController.update)
);

router.delete(
  "/:id",
  authMiddleware,
  asyncHandler(reviewController.remove)
);

router.get(
  "/listings/:listing_id",
  asyncHandler(reviewController.getForListing)
);

export default router;
