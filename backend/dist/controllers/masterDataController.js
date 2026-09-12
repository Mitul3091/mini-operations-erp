import prisma from "../config/prisma.js";
import { categorySchema, locationSchema, itemSchema, batchSchema, } from "../validators/masterDataValidator.js";
export const createCategory = async (req, res) => {
    try {
        const result = categorySchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid request data",
                errors: result.error.issues,
            });
        }
        const category = await prisma.category.create({
            data: result.data,
        });
        return res.status(201).json({
            success: true,
            message: "Category created successfully",
            category,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(409).json({
            success: false,
            message: "Category already exists",
        });
    }
};
export const createLocation = async (req, res) => {
    try {
        const result = locationSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid request data",
                errors: result.error.issues,
            });
        }
        const location = await prisma.location.create({
            data: result.data,
        });
        return res.status(201).json({
            success: true,
            message: "Location created successfully",
            location,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(409).json({
            success: false,
            message: "Location already exists",
        });
    }
};
export const createItem = async (req, res) => {
    try {
        const result = itemSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid request data",
                errors: result.error.issues,
            });
        }
        const { categoryId, ...itemData } = result.data;
        const category = await prisma.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found",
            });
        }
        const item = await prisma.item.create({
            data: {
                ...itemData,
                categoryId,
            },
            include: {
                category: true,
            },
        });
        return res.status(201).json({
            success: true,
            message: "Item created successfully",
            item,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(409).json({
            success: false,
            message: "Item with this SKU already exists",
        });
    }
};
export const createBatch = async (req, res) => {
    try {
        const result = batchSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: "Invalid request data",
                errors: result.error.issues,
            });
        }
        const { itemId, batchNumber } = result.data;
        const item = await prisma.item.findUnique({
            where: { id: itemId },
        });
        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found",
            });
        }
        const batch = await prisma.batch.create({
            data: {
                itemId,
                batchNumber,
            },
            include: {
                item: true,
            },
        });
        return res.status(201).json({
            success: true,
            message: "Batch created successfully",
            batch,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(409).json({
            success: false,
            message: "Batch already exists for this item",
        });
    }
};
export const getCategories = async (_req, res) => {
    const categories = await prisma.category.findMany({
        orderBy: { id: "desc" },
    });
    return res.json({
        success: true,
        categories,
    });
};
export const getLocations = async (_req, res) => {
    const locations = await prisma.location.findMany({
        orderBy: { id: "desc" },
    });
    return res.json({
        success: true,
        locations,
    });
};
export const getItems = async (_req, res) => {
    const items = await prisma.item.findMany({
        include: {
            category: true,
        },
        orderBy: { id: "desc" },
    });
    return res.json({
        success: true,
        items,
    });
};
export const getBatches = async (_req, res) => {
    const batches = await prisma.batch.findMany({
        include: {
            item: true,
        },
        orderBy: { id: "desc" },
    });
    return res.json({
        success: true,
        batches,
    });
};
