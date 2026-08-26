import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as contractController from '../controllers/contract.controller.js';

const router = Router();

router.post('/', authMiddleware, asyncHandler(contractController.create));
router.get('/:id', authMiddleware, asyncHandler(contractController.getById));
router.patch('/:id', authMiddleware, asyncHandler(contractController.sign));

export default router;
