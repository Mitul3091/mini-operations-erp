import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import {
  createInventorySchema,
  stockTransactionSchema,
} from "../validators/inventoryValidator.js";

export const createInventory = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const result = createInventorySchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: result.error.issues,
      });
    }

    const {
      itemId,
      locationId,
      batchId,
      physicalQuantity,
      reservedQuantity,
    } = result.data;

    if (reservedQuantity > physicalQuantity) {
      return res.status(400).json({
        success: false,
        message: "Reserved quantity cannot exceed physical quantity",
      });
    }

    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    if (batchId) {
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
      });

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: "Batch not found",
        });
      }

      if (batch.itemId !== itemId) {
        return res.status(400).json({
          success: false,
          message: "Batch does not belong to the selected item",
        });
      }
    }

    const existingInventory = await prisma.inventory.findFirst({
      where: {
        itemId,
        locationId,
        batchId: batchId ?? null,
      },
    });

    if (existingInventory) {
      return res.status(409).json({
        success: false,
        message: "Inventory already exists for this item, location and batch",
      });
    }

    const inventory = await prisma.inventory.create({
      data: {
        itemId,
        locationId,
        batchId,
        physicalQuantity,
        reservedQuantity,
      },
      include: {
        item: true,
        location: true,
        batch: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Inventory created successfully",
      inventory: {
        ...inventory,
        availableQuantity:
          inventory.physicalQuantity - inventory.reservedQuantity,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create inventory",
    });
  }
};

export const getInventory = async (
  _req: AuthRequest,
  res: Response
) => {
  try {
    const inventories = await prisma.inventory.findMany({
      include: {
        item: {
          include: {
            category: true,
          },
        },
        location: true,
        batch: true,
      },
      orderBy: {
        id: "desc",
      },
    });

    return res.json({
      success: true,
      inventory: inventories.map((inventory) => ({
        ...inventory,
        availableQuantity:
          inventory.physicalQuantity - inventory.reservedQuantity,
      })),
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
    });
  }
};

export const createStockTransaction = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const result = stockTransactionSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: result.error.issues,
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      inventoryId,
      type,
      quantity,
      transactionKey,
    } = result.data;

    const existingTransaction =
      await prisma.inventoryTransaction.findUnique({
        where: {
          transactionKey,
        },
      });

    if (existingTransaction) {
      return res.status(409).json({
        success: false,
        message: "Duplicate inventory transaction",
      });
    }

    const resultTransaction = await prisma.$transaction(
      async (tx) => {
        const inventory = await tx.inventory.findUnique({
          where: {
            id: inventoryId,
          },
        });

        if (!inventory) {
          throw new Error("INVENTORY_NOT_FOUND");
        }

        const availableQuantity =
          inventory.physicalQuantity - inventory.reservedQuantity;

        if (type === "OUT" && quantity > availableQuantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const updatedInventory =
          await tx.inventory.update({
            where: {
              id: inventoryId,
            },
            data: {
              physicalQuantity:
                type === "IN"
                  ? {
                      increment: quantity,
                    }
                  : {
                      decrement: quantity,
                    },
            },
          });

        const transaction =
          await tx.inventoryTransaction.create({
            data: {
              transactionKey,
              inventoryId,
              itemId: inventory.itemId,
              locationId: inventory.locationId,
              batchId: inventory.batchId,
              type,
              quantity,
              createdById: req.user!.userId,
            },
          });

        return {
          transaction,
          updatedInventory,
        };
      }
    );

    return res.status(201).json({
      success: true,
      message: `Stock ${type} transaction created successfully`,
      transaction: resultTransaction.transaction,
      inventory: {
        ...resultTransaction.updatedInventory,
        availableQuantity:
          resultTransaction.updatedInventory.physicalQuantity -
          resultTransaction.updatedInventory.reservedQuantity,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVENTORY_NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Inventory not found",
        });
      }

      if (error.message === "INSUFFICIENT_STOCK") {
        return res.status(400).json({
          success: false,
          message: "Insufficient available stock",
        });
      }
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create stock transaction",
    });
  }
};