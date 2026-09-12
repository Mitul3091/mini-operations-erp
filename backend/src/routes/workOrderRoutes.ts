import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  createWorkOrder,
  getWorkOrders,
  updateWorkOrderStatus,
} from "../controllers/workOrderController.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER", "SALES_USER"),
  getWorkOrders
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  createWorkOrder
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER"),
  updateWorkOrderStatus
);

export default router;