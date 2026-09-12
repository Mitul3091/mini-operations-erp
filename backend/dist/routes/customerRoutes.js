import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { createCustomer, getCustomers, } from "../controllers/customerController.js";
const router = Router();
router.get("/", authenticate, authorize("ADMIN", "OPERATIONS_USER", "SALES_USER"), getCustomers);
router.post("/", authenticate, authorize("ADMIN", "SALES_USER"), createCustomer);
export default router;
