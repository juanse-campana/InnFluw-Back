import { Router } from "express";
import {
  getDiscountCodes,
  getDiscountCode,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  validateDiscountCode,
} from "../controllers/discountCodes.controller.js";
import { validate } from "../utils/errors.js";
import {
  createDiscountCodeSchema,
  updateDiscountCodeSchema,
} from "../utils/schemas.js";
import { authMiddleware } from "../middleware/index.js";

const router = Router();

router.get("/", authMiddleware, getDiscountCodes);
router.get("/validate", validateDiscountCode);
router.get("/:id", authMiddleware, getDiscountCode);

router.post(
  "/",
  authMiddleware,
  validate(createDiscountCodeSchema),
  createDiscountCode,
);
router.patch(
  "/:id",
  authMiddleware,
  validate(updateDiscountCodeSchema),
  updateDiscountCode,
);
router.delete("/:id", authMiddleware, deleteDiscountCode);

export default router;
