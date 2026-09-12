import { useEffect, useState } from "react";
import api from "../services/api";

type Customer = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
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

type OrderItem = {
  id: number;
  itemId: number;
  quantity: number;
  item: {
    id: number;
    name: string;
    sku: string;
  };
};

type Order = {
  id: number;
  orderNumber: string;
  customerId: number;
  locationId: number;
  createdById: number;
  status: "RESERVED" | "COMPLETED" | "CANCELLED";
  customer: Customer;
  location: Location;
  createdBy: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  items: OrderItem[];
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [orderNumber, setOrderNumber] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchOrders = async () => {
    try {
      const response = await api.get("/orders");
      setOrders(response.data.orders);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load customer orders"
      );
    }
  };

  const fetchFormData = async () => {
    try {
      const [customersResponse, locationsResponse, itemsResponse] =
        await Promise.all([
          api.get("/customers"),
          api.get("/master-data/locations"),
          api.get("/master-data/items"),
        ]);

      setCustomers(customersResponse.data.customers);
      setLocations(locationsResponse.data.locations);
      setItems(itemsResponse.data.items);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load order form data"
      );
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      await Promise.all([fetchOrders(), fetchFormData()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      await api.post("/orders", {
        orderNumber,
        customerId: Number(customerId),
        locationId: Number(locationId),
        items: [
          {
            itemId: Number(itemId),
            quantity: Number(quantity),
          },
        ],
      });

      setSuccess("Customer order created and stock reserved successfully.");

      setOrderNumber("");
      setCustomerId("");
      setLocationId("");
      setItemId("");
      setQuantity("");

      await fetchOrders();
    } catch (err: any) {
      const responseData = err.response?.data;

      if (responseData?.details) {
        setError(
          `${responseData.message}. Available: ${responseData.details.availableQuantity}, Requested: ${responseData.details.requestedQuantity}`
        );
      } else {
        setError(
          responseData?.message || "Failed to create customer order"
        );
      }
    } finally {
      setCreating(false);
    }
  };

  const updateOrderStatus = async (
    id: number,
    status: "COMPLETED"
  ) => {
    try {
      setError("");
      setSuccess("");

      await api.patch(`/orders/${id}/status`, {
        status,
      });

      setSuccess("Order status updated successfully.");
      await fetchOrders();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to update order status"
      );
    }
  };

  if (loading) {
    return <div className="page-container">Loading customer orders...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Customer Orders</h1>
          <p>Create orders and reserve available stock</p>
        </div>

        <button onClick={loadData}>Refresh</button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {(user.role === "ADMIN" || user.role === "SALES_USER") && (
        <div className="form-card">
          <h2>Create Customer Order</h2>

          <form onSubmit={createOrder} className="order-form">
            <div>
              <label>Order Number</label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-003"
                required
              />
            </div>

            <div>
              <label>Customer</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.email ? ` - ${customer.email}` : ""}
                  </option>
                ))}
              </select>
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
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="5"
                required
              />
            </div>

            <button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Order"}
            </button>
          </form>
        </div>
      )}

      {!error && orders.length === 0 && (
        <div className="empty-message">No customer orders found.</div>
      )}

      {!error && orders.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer</th>
                <th>Location</th>
                <th>Items</th>
                <th>Created By</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.orderNumber}</td>

                  <td>{order.customer.name}</td>

                  <td>{order.location.name}</td>

                  <td>
                    {order.items.map((orderItem) => (
                      <div key={orderItem.id}>
                        {orderItem.item.name} × {orderItem.quantity}
                      </div>
                    ))}
                  </td>

                  <td>{order.createdBy.name}</td>

                  <td>
                    <span
                      className={`status ${order.status.toLowerCase()}`}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td>
                    {(user.role === "ADMIN" ||
                      user.role === "SALES_USER") &&
                      order.status === "RESERVED" && (
                        <button
                          onClick={() =>
                            updateOrderStatus(order.id, "COMPLETED")
                          }
                        >
                          Complete
                        </button>
                      )}

                    {order.status === "COMPLETED" && (
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

export default Orders;