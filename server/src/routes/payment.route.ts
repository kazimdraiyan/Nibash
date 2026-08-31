import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as paymentController from "../controllers/payment.controller.js";

const router = Router();

router.post("/", authMiddleware, asyncHandler(paymentController.create));
router.get(
  "/contracts/:contract_id",
  authMiddleware,
  asyncHandler(paymentController.getForContract),
);
router.patch(
  "/:payment_id",
  authMiddleware,
  asyncHandler(paymentController.resolve),
);

export default router;
