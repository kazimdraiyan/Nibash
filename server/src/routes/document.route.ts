import { Router } from "express";
import authMiddleware from "../middleware/auth.js";
import { requireVerifier } from "../middleware/verifier.js";
import { upload } from "../middleware/upload.js";
import * as documentController from "../controllers/document.controller.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
  "/listings/:id",
  authMiddleware,
  upload.array("files", 5),
  asyncHandler(documentController.upload),
);

// Owner-or-verifier check happens inside the service.
router.get(
  "/listings/:id",
  authMiddleware,
  asyncHandler(documentController.list),
);

router.post(
  "/:documentId/verify",
  authMiddleware,
  requireVerifier,
  asyncHandler(documentController.verify),
);

export default router;