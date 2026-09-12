import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthRequest } from "../middleware/authMiddleware.js";
import {
  createWorkOrderSchema,
  updateWorkOrderStatusSchema,
} from "../validators/workOrderValidator.js";

export const createWorkOrder = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const result = createWorkOrderSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: result.error.issues,
      });
    }

    const {
      workOrderNumber,
      locationId,
      itemId,
      requiredQuantity,
      assignedUserId,
    } = result.data;

    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
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

    const assignedUser = await prisma.user.findUnique({
      where: { id: assignedUserId },
    });

    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: "Assigned user not found",
      });
    }

    if (
      assignedUser.role !== "ADMIN" &&
      assignedUser.role !== "OPERATIONS_USER"
    ) {
      return res.status(400).json({
        success: false,
        message: "Work order can only be assigned to Admin or Operations User",
      });
    }

    const existingWorkOrder = await prisma.workOrder.findUnique({
      where: { workOrderNumber },
    });

    if (existingWorkOrder) {
      return res.status(409).json({
        success: false,
        message: "Work order number already exists",
      });
    }

    const inventory = await prisma.inventory.findFirst({
      where: {
        itemId,
        locationId,
      },
    });

    const availableQuantity = inventory
      ? inventory.physicalQuantity - inventory.reservedQuantity
      : 0;

    const shortage = Math.max(
      requiredQuantity - availableQuantity,
      0
    );

    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber,
        locationId,
        itemId,
        requiredQuantity,
        assignedUserId,
        createdById: req.user.userId,
      },
      include: {
        location: true,
        item: true,
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
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

    return res.status(201).json({
      success: true,
      message: "Work order created successfully",
      workOrder: {
        ...workOrder,
        availableQuantity,
        shortage,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create work order",
    });
  }
};

export const getWorkOrders = async (
  _req: AuthRequest,
  res: Response
) => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      include: {
        location: true,
        item: true,
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
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
      orderBy: {
        id: "desc",
      },
    });

    const workOrdersWithShortage = await Promise.all(
      workOrders.map(async (workOrder) => {
        const inventory = await prisma.inventory.findFirst({
          where: {
            itemId: workOrder.itemId,
            locationId: workOrder.locationId,
          },
        });

        const availableQuantity = inventory
          ? inventory.physicalQuantity -
            inventory.reservedQuantity
          : 0;

        const shortage = Math.max(
          workOrder.requiredQuantity - availableQuantity,
          0
        );

        return {
          ...workOrder,
          availableQuantity,
          shortage,
        };
      })
    );

    return res.json({
      success: true,
      workOrders: workOrdersWithShortage,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch work orders",
    });
  }
};

export const updateWorkOrderStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const workOrderId = Number(req.params.id);

    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid work order ID",
      });
    }

    const result = updateWorkOrderStatusSchema.safeParse(
      req.body
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: result.error.issues,
      });
    }

    const { status } = result.data;

    const workOrder = await prisma.workOrder.findUnique({
      where: {
        id: workOrderId,
      },
    });

    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: "Work order not found",
      });
    }

    if (
      req.user.role === "OPERATIONS_USER" &&
      workOrder.assignedUserId !== req.user.userId
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update work orders assigned to you",
      });
    }

    const updatedWorkOrder =
      await prisma.workOrder.update({
        where: {
          id: workOrderId,
        },
        data: {
          status,
        },
        include: {
          location: true,
          item: true,
          assignedUser: {
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
      message: "Work order status updated successfully",
      workOrder: updatedWorkOrder,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update work order status",
    });
  }
};