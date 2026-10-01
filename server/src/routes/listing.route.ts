import { Router } from "express";
import authMiddleware, { optionalAuthMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as listingController from "../controllers/listing.controller.js";
import { upload } from "../middleware/upload.js";
import { searchRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.get("/", asyncHandler(listingController.getAll));
router.get("/my", optionalAuthMiddleware, authMiddleware, asyncHandler(listingController.getMy));
router.get("/search", searchRateLimiter, asyncHandler(listingController.search));
router.get("/amenities", asyncHandler(listingController.getAmenities));
router.get("/starred", authMiddleware, asyncHandler(listingController.getStarred));
router.get("/:id/tenants", authMiddleware, asyncHandler(listingController.getTenantsHistory));
router.get("/:id", optionalAuthMiddleware, asyncHandler(listingController.getById));
router.get("/:id/starred", optionalAuthMiddleware, asyncHandler(listingController.isStarred));
router.post("/", authMiddleware, asyncHandler(listingController.create));
router.patch("/:id", authMiddleware, asyncHandler(listingController.update));
router.delete("/:id", authMiddleware, asyncHandler(listingController.remove));
router.post("/:id/media", authMiddleware, upload.array("images", 10), asyncHandler(listingController.uploadMedia));
router.post("/:id/togglestar", authMiddleware, asyncHandler(listingController.toggleStar));

export default router;

