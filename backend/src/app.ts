import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import masterDataRoutes from "./routes/masterDataRoutes.js";
import workOrderRoutes from "./routes/workOrderRoutes.js";
import transferRoutes from "./routes/transferRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Mini Operations ERP API is running",
  });
});

app.use("/auth", authRoutes);
app.use("/test", testRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/master-data", masterDataRoutes);
app.use("/work-orders", workOrderRoutes);
app.use("/transfers", transferRoutes);
app.use("/orders", orderRoutes);
app.use("/customers", customerRoutes);

export default app;