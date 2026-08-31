import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as applicationController from "../controllers/application.controller.js";

const router = Router();

router.post("/", authMiddleware, asyncHandler(applicationController.apply));
router.get("/", authMiddleware, asyncHandler(applicationController.getAll));
router.get(
  "/:listingId",
  authMiddleware,
  asyncHandler(applicationController.getForListing),
);
router.put(
  "/:listingId/:tenantId",
  authMiddleware,
  asyncHandler(applicationController.reject),
);

export default router;
