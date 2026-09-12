import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2),
});

export const locationSchema = z.object({
  name: z.string().min(2),
});

export const itemSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  categoryId: z.number().int().positive(),
});

export const batchSchema = z.object({
  itemId: z.number().int().positive(),
  batchNumber: z.string().min(1),
});