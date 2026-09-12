import { Router } from "express";
import { authenticate } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  createCategory,
  createLocation,
  createItem,
  createBatch,
  getCategories,
  getLocations,
  getItems,
  getBatches,
} from "../controllers/masterDataController.js";

const router = Router();

router.get(
  "/categories",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER", "SALES_USER"),
  getCategories
);

router.post(
  "/categories",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER"),
  createCategory
);

router.get(
  "/locations",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER", "SALES_USER"),
  getLocations
);

router.post(
  "/locations",
  authenticate,
  authorize("ADMIN"),
  createLocation
);

router.get(
  "/items",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER", "SALES_USER"),
  getItems
);

router.post(
  "/items",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER"),
  createItem
);

router.get(
  "/batches",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER", "SALES_USER"),
  getBatches
);

router.post(
  "/batches",
  authenticate,
  authorize("ADMIN", "OPERATIONS_USER"),
  createBatch
);

export default router;
