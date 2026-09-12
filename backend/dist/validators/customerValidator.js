import { z } from "zod";
export const customerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(5).optional(),
});
