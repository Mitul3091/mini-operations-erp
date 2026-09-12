import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  createTransfer,
  getTransfers,
  updateTransferStatus,
} from "../controllers/transferController.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER", "SALES_USER"),
  getTransfers
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER"),
  createTransfer
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER"),
  updateTransferStatus
);

export default router;