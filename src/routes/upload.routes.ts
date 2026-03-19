import { Router } from 'express';
import { uploadFile, getFile } from '../controllers/upload.controller.js';
import { authMiddleware, uploadMiddleware } from '../middleware/index.js';

const router = Router();

router.post('/', authMiddleware, uploadMiddleware, uploadFile);
router.get('/:filename', getFile);

export default router;
