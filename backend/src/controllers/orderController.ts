import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validators/orderValidator.js";

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const data = createOrderSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const location = await prisma.location.findUnique({
      where: { id: data.locationId },
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    const itemIds = data.items.map((item) => item.itemId);

    if (new Set(itemIds).size !== itemIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate items are not allowed in one order",
      });
    }

    const items = await prisma.item.findMany({
      where: {
        id: {
          in: itemIds,
        },
      },
    });

    if (items.length !== itemIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more items not found",
      });
    }

    const existingOrder = await prisma.customerOrder.findUnique({
      where: { orderNumber: data.orderNumber },
    });

    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: "Order number already exists",
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      const inventories = await tx.inventory.findMany({
        where: {
          locationId: data.locationId,
          itemId: {
            in: itemIds,
          },
        },
      });

      for (const requestedItem of data.items) {
        const itemInventories = inventories.filter(
          (inventory) => inventory.itemId === requestedItem.itemId
        );

        const availableQuantity = itemInventories.reduce(
          (total, inventory) =>
            total + inventory.physicalQuantity - inventory.reservedQuantity,
          0
        );

        if (requestedItem.quantity > availableQuantity) {
          const error = new Error("INSUFFICIENT_STOCK");
          error.cause = {
            itemId: requestedItem.itemId,
            availableQuantity,
            requestedQuantity: requestedItem.quantity,
          };
          throw error;
        }
      }

      for (const requestedItem of data.items) {
        let remainingQuantity = requestedItem.quantity;

        const itemInventories = inventories.filter(
          (inventory) => inventory.itemId === requestedItem.itemId
        );

        for (const inventory of itemInventories) {
          if (remainingQuantity <= 0) {
            break;
          }

          const availableQuantity =
            inventory.physicalQuantity - inventory.reservedQuantity;

          if (availableQuantity <= 0) {
            continue;
          }

          const quantityToReserve = Math.min(
            availableQuantity,
            remainingQuantity
          );

          const updatedInventory = await tx.inventory.updateMany({
            where: {
              id: inventory.id,
              physicalQuantity: {
                gte: inventory.reservedQuantity + quantityToReserve,
              },
            },
            data: {
              reservedQuantity: {
                increment: quantityToReserve,
              },
            },
          });

          if (updatedInventory.count !== 1) {
            throw new Error("CONCURRENT_RESERVATION_CONFLICT");
          }

          await tx.inventoryTransaction.create({
            data: {
              transactionKey: `RESERVATION-${data.orderNumber}-${inventory.id}`,
              inventoryId: inventory.id,
              itemId: requestedItem.itemId,
              locationId: data.locationId,
              batchId: inventory.batchId,
              type: "RESERVATION",
              quantity: quantityToReserve,
              createdById: req.user!.userId,
            },
          });

          remainingQuantity -= quantityToReserve;
        }

        if (remainingQuantity > 0) {
          throw new Error("CONCURRENT_RESERVATION_CONFLICT");
        }
      }

      return tx.customerOrder.create({
        data: {
          orderNumber: data.orderNumber,
          customerId: data.customerId,
          locationId: data.locationId,
          createdById: req.user!.userId,
          status: "RESERVED",
          items: {
            create: data.items.map((item) => ({
              itemId: item.itemId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          customer: true,
          location: true,
          items: {
            include: {
              item: true,
            },
          },
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
    });

    return res.status(201).json({
      success: true,
      message: "Customer order created and stock reserved successfully",
      order,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") {
      return res.status(400).json({
        success: false,
        message: "Insufficient available stock for reservation",
        details: error.cause,
      });
    }

    if (
      error instanceof Error &&
      error.message === "CONCURRENT_RESERVATION_CONFLICT"
    ) {
      return res.status(409).json({
        success: false,
        message: "Stock reservation conflict. Please retry the order",
      });
    }

    return res.status(400).json({
      success: false,
      message: "Failed to create customer order",
    });
  }
};

export const getOrders = async (_req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.customerOrder.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
        location: true,
        items: {
          include: {
            item: true,
          },
        },
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
      orders,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer orders",
    });
  }
};

export const updateOrderStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const data = updateOrderStatusSchema.parse(req.body);

    const order = await prisma.customerOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Customer order not found",
      });
    }

    if (order.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cancelled orders cannot be updated",
      });
    }

    if (data.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Order cancellation is not supported yet",
      });
    }

    if (
      data.status === "COMPLETED" &&
      order.status !== "RESERVED"
    ) {
      return res.status(400).json({
        success: false,
        message: "Only reserved orders can be completed",
      });
    }

    const updatedOrder = await prisma.customerOrder.update({
      where: { id: orderId },
      data: {
        status: data.status,
      },
      include: {
        customer: true,
        location: true,
        items: {
          include: {
            item: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error(error);

    return res.status(400).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};