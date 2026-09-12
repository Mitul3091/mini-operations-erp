import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { createInventory, getInventory, createStockTransaction, } from "../controllers/inventoryController.js";
const router = Router();
router.get("/", authenticate, authorize("ADMIN", "OPERATIONS_USER", "SALES_USER"), getInventory);
router.post("/", authenticate, authorize("ADMIN", "OPERATIONS_USER"), createInventory);
router.post("/transactions", authenticate, authorize("ADMIN", "OPERATIONS_USER"), createStockTransaction);
export default router;
