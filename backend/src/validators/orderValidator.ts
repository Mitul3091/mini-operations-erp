import { z } from "zod";

export const createOrderSchema = z.object({
  orderNumber: z.string().min(2),
  customerId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  items: z.array(
    z.object({
      itemId: z.number().int().positive(),
      quantity: z.number().int().positive(),
    })
  ).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["RESERVED", "COMPLETED", "CANCELLED"]),
});