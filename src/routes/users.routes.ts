import { Router } from 'express';
import { getSellerBySlug } from '../controllers/users.controller.js';

const router = Router();

router.get('/sellers/:slug', getSellerBySlug);

export default router;
