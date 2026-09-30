import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as incomeController from "../controllers/income.controller.js";

const router = Router();

router.get("/", authMiddleware, asyncHandler(incomeController.getOverall));
router.get("/listings", authMiddleware, asyncHandler(incomeController.getListings));
router.get("/contracts", authMiddleware, asyncHandler(incomeController.getContracts));
router.get("/payments", authMiddleware, asyncHandler(incomeController.getPayments));

export default router;
