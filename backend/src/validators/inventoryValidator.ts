import { z } from "zod";

export const createInventorySchema = z.object({
  itemId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  batchId: z.number().int().positive().optional(),
  physicalQuantity: z.number().int().min(0),
  reservedQuantity: z.number().int().min(0).default(0),
});

export const stockTransactionSchema = z.object({
  inventoryId: z.number().int().positive(),
  type: z.enum(["IN", "OUT"]),
  quantity: z.number().int().positive(),
  transactionKey: z.string().min(1),
});