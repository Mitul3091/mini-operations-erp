import { useEffect, useState } from "react";
import api from "../services/api";

type WorkOrder = {
  id: number;
  workOrderNumber: string;
  locationId: number;
  itemId: number;
  requiredQuantity: number;
  assignedUserId: number;
  status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";
  availableQuantity: number;
  shortage: number;
  location: {
    id: number;
    name: string;
  };
  item: {
    id: number;
    name: string;
    sku: string;
  };
  assignedUser: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
};

type Location = {
  id: number;
  name: string;
};

type Item = {
  id: number;
  name: string;
  sku: string;
};

const WorkOrders = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [workOrderNumber, setWorkOrderNumber] = useState("");
  const [locationId, setLocationId] = useState("");
  const [itemId, setItemId] = useState("");
  const [requiredQuantity, setRequiredQuantity] = useState("");
  const [assignedUserId, setAssignedUserId] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchWorkOrders = async () => {
    try {
      const response = await api.get("/work-orders");
      setWorkOrders(response.data.workOrders);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load work orders"
      );
    }
  };

  const fetchFormData = async () => {
    try {
      const [locationsResponse, itemsResponse] = await Promise.all([
        api.get("/master-data/locations"),
        api.get("/master-data/items"),
      ]);

      setLocations(locationsResponse.data.locations);
      setItems(itemsResponse.data.items);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load form data"
      );
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([fetchWorkOrders(), fetchFormData()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createWorkOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      await api.post("/work-orders", {
        workOrderNumber,
        locationId: Number(locationId),
        itemId: Number(itemId),
        requiredQuantity: Number(requiredQuantity),
        assignedUserId: Number(assignedUserId),
      });

      setSuccess("Work order created successfully.");

      setWorkOrderNumber("");
      setLocationId("");
      setItemId("");
      setRequiredQuantity("");
      setAssignedUserId("");

      await fetchWorkOrders();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to create work order"
      );
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (
    id: number,
    status: "IN_PROGRESS" | "COMPLETED"
  ) => {
    try {
      setError("");
      setSuccess("");

      await api.patch(`/work-orders/${id}/status`, {
        status,
      });

      setSuccess("Work order status updated successfully.");
      await fetchWorkOrders();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to update work order"
      );
    }
  };

  if (loading) {
    return <div className="page-container">Loading work orders...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Work Orders</h1>
          <p>Manage operational work orders and shortages</p>
        </div>

        <button onClick={loadData}>Refresh</button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {user.role === "ADMIN" && (
        <div className="form-card">
          <h2>Create Work Order</h2>

          <form onSubmit={createWorkOrder} className="work-order-form">
            <div>
              <label>Work Order ID</label>
              <input
                type="text"
                value={workOrderNumber}
                onChange={(e) => setWorkOrderNumber(e.target.value)}
                placeholder="WO-002"
                required
              />
            </div>

            <div>
              <label>Location</label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Item</label>
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                required
              >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Required Quantity</label>
              <input
                type="number"
                min="1"
                value={requiredQuantity}
                onChange={(e) => setRequiredQuantity(e.target.value)}
                placeholder="10"
                required
              />
            </div>

            <div>
              <label>Assigned Operations User ID</label>
              <input
                type="number"
                min="1"
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                placeholder="2"
                required
              />
            </div>

            <button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Work Order"}
            </button>
          </form>
        </div>
      )}

      {!error && workOrders.length === 0 && (
        <div className="empty-message">No work orders found.</div>
      )}

      {!error && workOrders.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Work Order ID</th>
                <th>Item</th>
                <th>Location</th>
                <th>Required</th>
                <th>Available</th>
                <th>Shortage</th>
                <th>Assigned User</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {workOrders.map((workOrder) => (
                <tr key={workOrder.id}>
                  <td>{workOrder.workOrderNumber}</td>

                  <td>
                    {workOrder.item.name}
                    <br />
                    <small>{workOrder.item.sku}</small>
                  </td>

                  <td>{workOrder.location.name}</td>

                  <td>{workOrder.requiredQuantity}</td>

                  <td>{workOrder.availableQuantity}</td>

                  <td>{workOrder.shortage}</td>

                  <td>{workOrder.assignedUser.name}</td>

                  <td>
                    <span
                      className={`status ${workOrder.status.toLowerCase()}`}
                    >
                      {workOrder.status.replace("_", " ")}
                    </span>
                  </td>

                  <td>
                    {user.role === "ADMIN" &&
                      workOrder.status === "ASSIGNED" && (
                        <button
                          onClick={() =>
                            updateStatus(workOrder.id, "IN_PROGRESS")
                          }
                        >
                          Start
                        </button>
                      )}

                    {user.role === "OPERATIONS_USER" &&
                      workOrder.assignedUserId === user.id &&
                      workOrder.status === "ASSIGNED" && (
                        <button
                          onClick={() =>
                            updateStatus(workOrder.id, "IN_PROGRESS")
                          }
                        >
                          Start
                        </button>
                      )}

                    {user.role === "ADMIN" &&
                      workOrder.status === "IN_PROGRESS" && (
                        <button
                          onClick={() =>
                            updateStatus(workOrder.id, "COMPLETED")
                          }
                        >
                          Complete
                        </button>
                      )}

                    {user.role === "OPERATIONS_USER" &&
                      workOrder.assignedUserId === user.id &&
                      workOrder.status === "IN_PROGRESS" && (
                        <button
                          onClick={() =>
                            updateStatus(workOrder.id, "COMPLETED")
                          }
                        >
                          Complete
                        </button>
                      )}

                    {workOrder.status === "COMPLETED" && (
                      <span>Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WorkOrders;