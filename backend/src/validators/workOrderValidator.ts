import { z } from "zod";

export const createWorkOrderSchema = z.object({
  workOrderNumber: z.string().min(2),
  locationId: z.number().int().positive(),
  itemId: z.number().int().positive(),
  requiredQuantity: z.number().int().positive(),
  assignedUserId: z.number().int().positive(),
});

export const updateWorkOrderStatusSchema = z.object({
  status: z.enum(["ASSIGNED", "IN_PROGRESS", "COMPLETED"]),
});