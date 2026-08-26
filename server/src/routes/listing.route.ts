import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as listingController from '../controllers/listing.controller.js';

const router = Router();

router.get('/', asyncHandler(listingController.getAll));
router.get('/:id', asyncHandler(listingController.getById));
router.post('/', authMiddleware, asyncHandler(listingController.create));
router.patch('/:id', authMiddleware, asyncHandler(listingController.update));
router.delete('/:id', authMiddleware, asyncHandler(listingController.remove));

export default router;
