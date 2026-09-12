import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { createOrder, getOrders, updateOrderStatus, } from "../controllers/orderController.js";
const router = Router();
router.get("/", authenticate, authorize("ADMIN", "OPERATIONS_USER", "SALES_USER"), getOrders);
router.post("/", authenticate, authorize("ADMIN", "SALES_USER"), createOrder);
router.patch("/:id/status", authenticate, authorize("ADMIN", "SALES_USER"), updateOrderStatus);
export default router;
