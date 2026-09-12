import { Request, Response } from "express";
import { Prisma } from "../generated/prisma/client.js";
import prisma from "../config/prisma.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../validators/orderValidator.js";

export const createOrder = async (req: Request, res: Response) => {
  try {
    const result = createOrderSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const { orderNumber, customerId, locationId, items } = result.data;

    const existingOrder = await prisma.customerOrder.findUnique({
      where: { orderNumber },
    });

    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: "Order number already exists",
      });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
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

    const itemIds = items.map((item) => item.itemId);
    const uniqueItemIds = [...new Set(itemIds)];

    if (uniqueItemIds.length !== itemIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate items are not allowed in the same order",
      });
    }

    const existingItems = await prisma.item.findMany({
      where: {
        id: {
          in: uniqueItemIds,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingItems.length !== uniqueItemIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more items were not found",
      });
    }

    const resultOrder = await prisma.$transaction(
      async (tx) => {
        const inventories = await tx.inventory.findMany({
          where: {
            locationId,
            itemId: {
              in: uniqueItemIds,
            },
          },
          orderBy: {
            id: "asc",
          },
        });

        const allocationMap = new Map<number, Array<{
          inventoryId: number;
          quantity: number;
        }>>();

        for (const requestedItem of items) {
          const itemInventories = inventories.filter(
            (inventory) => inventory.itemId === requestedItem.itemId
          );

          const totalAvailable = itemInventories.reduce(
            (total, inventory) =>
              total +
              (inventory.physicalQuantity - inventory.reservedQuantity),
            0
          );

          if (totalAvailable < requestedItem.quantity) {
            throw new Error(
              JSON.stringify({
                type: "INSUFFICIENT_STOCK",
                itemId: requestedItem.itemId,
                availableQuantity: totalAvailable,
                requestedQuantity: requestedItem.quantity,
              })
            );
          }

          let remaining = requestedItem.quantity;
          const allocations: Array<{
            inventoryId: number;
            quantity: number;
          }> = [];

          for (const inventory of itemInventories) {
            if (remaining <= 0) {
              break;
            }

            const available =
              inventory.physicalQuantity -
              inventory.reservedQuantity;

            if (available <= 0) {
              continue;
            }

            const quantityToReserve = Math.min(
              available,
              remaining
            );

            allocations.push({
              inventoryId: inventory.id,
              quantity: quantityToReserve,
            });

            remaining -= quantityToReserve;
          }

          allocationMap.set(
            requestedItem.itemId,
            allocations
          );
        }

        for (const requestedItem of items) {
          const allocations =
            allocationMap.get(requestedItem.itemId) || [];

          for (const allocation of allocations) {
            const updatedInventory = await tx.inventory.updateMany({
              where: {
                id: allocation.inventoryId,
                physicalQuantity: {
                  gte: allocation.quantity,
                },
                reservedQuantity: {
                  lte:
                    inventories.find(
                      (inventory) =>
                        inventory.id === allocation.inventoryId
                    )!.physicalQuantity -
                    allocation.quantity,
                },
              },
              data: {
                reservedQuantity: {
                  increment: allocation.quantity,
                },
              },
            });

            if (updatedInventory.count !== 1) {
              throw new Error(
                JSON.stringify({
                  type: "CONCURRENT_RESERVATION_CONFLICT",
                })
              );
            }

            await tx.inventoryTransaction.create({
              data: {
                transactionKey: `RESERVATION-${orderNumber}-${allocation.inventoryId}`,
                inventoryId: allocation.inventoryId,
                itemId: requestedItem.itemId,
                locationId,
                batchId:
                  inventories.find(
                    (inventory) =>
                      inventory.id === allocation.inventoryId
                  )?.batchId ?? null,
                type: "RESERVATION",
                quantity: allocation.quantity,
                createdById: req.user!.userId,
              },
            });
          }
        }

        const order = await tx.customerOrder.create({
          data: {
            orderNumber,
            customerId,
            locationId,
            createdById: req.user!.userId,
            status: "RESERVED",
            items: {
              create: items.map((item) => ({
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

        return order;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    return res.status(201).json({
      success: true,
      message:
        "Customer order created and stock reserved successfully",
      order: resultOrder,
    });
  } catch (error: any) {
    let parsedError: any = null;

    try {
      parsedError = JSON.parse(error?.message || "{}");
    } catch {
      parsedError = null;
    }

    if (parsedError?.type === "INSUFFICIENT_STOCK") {
      return res.status(400).json({
        success: false,
        message: "Insufficient available stock for reservation",
        details: {
          itemId: parsedError.itemId,
          availableQuantity: parsedError.availableQuantity,
          requestedQuantity: parsedError.requestedQuantity,
        },
      });
    }

    if (
      parsedError?.type === "CONCURRENT_RESERVATION_CONFLICT" ||
      error?.code === "P2034"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Stock reservation conflict. Please retry the order",
      });
    }

    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Order number already exists",
      });
    }

    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create customer order",
    });
  }
};

export const getOrders = async (_req: Request, res: Response) => {
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

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("Get orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer orders",
    });
  }
};

export const updateOrderStatus = async (
  req: Request,
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

    const result = updateOrderStatusSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    const { status } = result.data;

    const order = await prisma.customerOrder.findUnique({
      where: {
        id: orderId,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Cancelled orders cannot be updated",
      });
    }

    if (status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Order cancellation is not supported",
      });
    }

    if (order.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Completed orders cannot be updated",
      });
    }

    if (order.status === "RESERVED" && status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Reserved orders can only be completed",
      });
    }

    const updatedOrder = await prisma.customerOrder.update({
      where: {
        id: orderId,
      },
      data: {
        status,
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

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Update order status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
    });
  }
};