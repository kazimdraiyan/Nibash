import { Router } from "express";
import authMiddleware, { optionalAuthMiddleware } from "../middleware/auth.js";
import { requireVerifier } from "../middleware/verifier.js";
import * as verifyController from "../controllers/verify.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.get("/listings", authMiddleware, requireVerifier, asyncHandler(verifyController.getUnverified));
router.post("/listings/:id/verify", authMiddleware, requireVerifier, asyncHandler(verifyController.verify));

export default router;