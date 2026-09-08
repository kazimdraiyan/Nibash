import { Router } from "express";
import authMiddleware, { optionalAuthMiddleware } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as listingController from "../controllers/listing.controller.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", asyncHandler(listingController.getAll));
router.get("/my",optionalAuthMiddleware,authMiddleware,asyncHandler(listingController.getMy));
router.get("/:id",optionalAuthMiddleware ,asyncHandler(listingController.getById));
router.post("/", authMiddleware, asyncHandler(listingController.create));
router.patch("/:id", authMiddleware, asyncHandler(listingController.update));
router.delete("/:id", authMiddleware, asyncHandler(listingController.remove));
router.post("/:id/media", authMiddleware, upload.array("images", 10), asyncHandler(listingController.uploadMedia));

export default router;
