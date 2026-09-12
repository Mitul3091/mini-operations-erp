import { NextFunction, Response } from "express";
import { AuthRequest } from "./authMiddleware.js";

type Role = "ADMIN" | "OPERATIONS_USER" | "SALES_USER";

export const authorize = (...allowedRoles: Role[]) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
};