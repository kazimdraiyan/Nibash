import { Router } from "express";  
import authMiddleware from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.get("/me", authMiddleware, asyncHandler(authController.me));
router.post(
  "/become-owner",
  authMiddleware,
  asyncHandler(authController.becomeOwner),
);
router.post(
  "/become-tenant",
  authMiddleware,
  asyncHandler(authController.becomeTenant),
);

export default router;
