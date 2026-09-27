import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import { requireVerifier } from "../middleware/verifier.js";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  authMiddleware,
  requireVerifier,
  asyncHandler(dashboardController.getDashboard)
);

export default router;
