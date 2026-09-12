import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
const router = Router();
router.get("/admin", authenticate, authorize("ADMIN"), (req, res) => {
    res.json({
        success: true,
        message: "Admin access granted",
        user: req.user,
    });
});
router.get("/operations", authenticate, authorize("ADMIN", "OPERATIONS_USER"), (req, res) => {
    res.json({
        success: true,
        message: "Operations access granted",
        user: req.user,
    });
});
router.get("/sales", authenticate, authorize("ADMIN", "SALES_USER"), (req, res) => {
    res.json({
        success: true,
        message: "Sales access granted",
        user: req.user,
    });
});
export default router;
