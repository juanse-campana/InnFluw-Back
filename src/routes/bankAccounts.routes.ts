import { Router } from 'express';
import {
  createBankAccount,
  deleteBankAccount,
  getBankAccounts,
  getPublicBankAccounts,
  updateBankAccount,
} from '../controllers/bankAccounts.controller.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

router.get('/public/:sellerId', getPublicBankAccounts);
router.get('/', authMiddleware, getBankAccounts);
router.post('/', authMiddleware, createBankAccount);
router.patch('/:id', authMiddleware, updateBankAccount);
router.delete('/:id', authMiddleware, deleteBankAccount);

export default router;
