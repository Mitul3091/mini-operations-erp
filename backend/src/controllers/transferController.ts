import { Request, Response } from "express";
import prisma from "../config/prisma.js";
import { createTransferSchema, updateTransferStatusSchema } from "../validators/transferValidator.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

export const createTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const data = createTransferSchema.parse(req.body);

    if (data.sourceLocationId === data.destinationLocationId) {
      return res.status(400).json({
        success: false,
        message: "Source and destination locations must be different",
      });
    }

    const [sourceLocation, destinationLocation, item] = await Promise.all([
      prisma.location.findUnique({
        where: { id: data.sourceLocationId },
      }),
      prisma.location.findUnique({
        where: { id: data.destinationLocationId },
      }),
      prisma.item.findUnique({
        where: { id: data.itemId },
      }),
    ]);

    if (!sourceLocation) {
      return res.status(404).json({
        success: false,
        message: "Source location not found",
      });
    }

    if (!destinationLocation) {
      return res.status(404).json({
        success: false,
        message: "Destination location not found",
      });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const existingTransfer = await prisma.stockTransfer.findUnique({
      where: { transferNumber: data.transferNumber },
    });

    if (existingTransfer) {
      return res.status(409).json({
        success: false,
        message: "Transfer number already exists",
      });
    }

    const sourceInventories = await prisma.inventory.findMany({
      where: {
        itemId: data.itemId,
        locationId: data.sourceLocationId,
      },
    });

    const availableQuantity = sourceInventories.reduce(
      (total, inventory) =>
        total + inventory.physicalQuantity - inventory.reservedQuantity,
      0
    );

    if (data.quantity > availableQuantity) {
      return res.status(400).json({
        success: false,
        message: "Insufficient available stock for transfer",
        availableQuantity,
        requestedQuantity: data.quantity,
      });
    }

    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNumber: data.transferNumber,
        sourceLocationId: data.sourceLocationId,
        destinationLocationId: data.destinationLocationId,
        itemId: data.itemId,
        quantity: data.quantity,
        createdById: req.user!.userId,
        status: "REQUESTED",
      },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Stock transfer created successfully",
      transfer,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: "Failed to create stock transfer",
    });
  }
};

export const getTransfers = async (_req: Request, res: Response) => {
  try {
    const transfers = await prisma.stockTransfer.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        item: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      transfers,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch stock transfers",
    });
  }
};

export const updateTransferStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const transferId = Number(req.params.id);

    if (!Number.isInteger(transferId) || transferId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid transfer ID",
      });
    }

    const data = updateTransferStatusSchema.parse(req.body);

    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
    }

    if (data.status === "DISPATCHED") {
      if (transfer.status !== "REQUESTED") {
        return res.status(400).json({
          success: false,
          message: "Only requested transfers can be dispatched",
        });
      }

      const updatedTransfer = await prisma.$transaction(async (tx) => {
        const inventories = await tx.inventory.findMany({
          where: {
            itemId: transfer.itemId,
            locationId: transfer.sourceLocationId,
          },
        });

        const availableQuantity = inventories.reduce(
          (total, inventory) =>
            total + inventory.physicalQuantity - inventory.reservedQuantity,
          0
        );

        if (transfer.quantity > availableQuantity) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        let remainingQuantity = transfer.quantity;

        for (const inventory of inventories) {
          if (remainingQuantity <= 0) break;

          const available =
            inventory.physicalQuantity - inventory.reservedQuantity;

          const quantityToRemove = Math.min(available, remainingQuantity);

          await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              physicalQuantity: {
                decrement: quantityToRemove,
              },
            },
          });

          await tx.inventoryTransaction.create({
            data: {
              transactionKey: `TRANSFER-DISPATCH-${transfer.id}-${inventory.id}`,
              inventoryId: inventory.id,
              itemId: transfer.itemId,
              locationId: transfer.sourceLocationId,
              batchId: inventory.batchId,
              type: "OUT",
              quantity: quantityToRemove,
              createdById: req.user!.userId,
            },
          });

          remainingQuantity -= quantityToRemove;
        }

        return tx.stockTransfer.update({
          where: { id: transfer.id },
          data: {
            status: "DISPATCHED",
            dispatchedAt: new Date(),
          },
          include: {
            sourceLocation: true,
            destinationLocation: true,
            item: true,
          },
        });
      });

      return res.json({
        success: true,
        message: "Stock transfer dispatched successfully",
        transfer: updatedTransfer,
      });
    }

    if (data.status === "RECEIVED") {
      if (transfer.status !== "DISPATCHED") {
        return res.status(400).json({
          success: false,
          message: "Only dispatched transfers can be received",
        });
      }

      const updatedTransfer = await prisma.$transaction(async (tx) => {
        let destinationInventory = await tx.inventory.findFirst({
          where: {
            itemId: transfer.itemId,
            locationId: transfer.destinationLocationId,
          },
        });

        if (!destinationInventory) {
          destinationInventory = await tx.inventory.create({
            data: {
              itemId: transfer.itemId,
              locationId: transfer.destinationLocationId,
              physicalQuantity: 0,
              reservedQuantity: 0,
            },
          });
        }

        await tx.inventory.update({
          where: { id: destinationInventory.id },
          data: {
            physicalQuantity: {
              increment: transfer.quantity,
            },
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            transactionKey: `TRANSFER-RECEIVE-${transfer.id}`,
            inventoryId: destinationInventory.id,
            itemId: transfer.itemId,
            locationId: transfer.destinationLocationId,
            batchId: destinationInventory.batchId,
            type: "IN",
            quantity: transfer.quantity,
            createdById: req.user!.userId,
          },
        });

        return tx.stockTransfer.update({
          where: { id: transfer.id },
          data: {
            status: "RECEIVED",
            receivedAt: new Date(),
          },
          include: {
            sourceLocation: true,
            destinationLocation: true,
            item: true,
          },
        });
      });

      return res.json({
        success: true,
        message: "Stock transfer received successfully",
        transfer: updatedTransfer,
      });
    }

    return res.status(400).json({
      success: false,
      message: "Invalid transfer status transition",
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return res.status(400).json({
        success: false,
        message: "Insufficient available stock for transfer",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Failed to update stock transfer",
    });
  }
};