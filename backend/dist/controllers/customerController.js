import prisma from "../config/prisma.js";
import { customerSchema } from "../validators/customerValidator.js";
export const createCustomer = async (req, res) => {
    try {
        const data = customerSchema.parse(req.body);
        const customer = await prisma.customer.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
            },
        });
        return res.status(201).json({
            success: true,
            message: "Customer created successfully",
            customer,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(400).json({
            success: false,
            message: "Failed to create customer",
        });
    }
};
export const getCustomers = async (_req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });
        return res.json({
            success: true,
            customers,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch customers",
        });
    }
};
