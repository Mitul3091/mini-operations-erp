import { z } from "zod";
export const createTransferSchema = z.object({
    transferNumber: z.string().min(2),
    sourceLocationId: z.number().int().positive(),
    destinationLocationId: z.number().int().positive(),
    itemId: z.number().int().positive(),
    quantity: z.number().int().positive(),
});
export const updateTransferStatusSchema = z.object({
    status: z.enum(["REQUESTED", "DISPATCHED", "RECEIVED"]),
});
