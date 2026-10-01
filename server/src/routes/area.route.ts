import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import * as areaController from "../controllers/area.controller.js";

const router = Router();

router.get("/stats", asyncHandler(areaController.getStats));

export default router;
