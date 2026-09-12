import { useEffect, useState } from "react";
import api from "../services/api";

type Transfer = {
  id: number;
  transferNumber: string;
  sourceLocationId: number;
  destinationLocationId: number;
  itemId: number;
  quantity: number;
  status: "REQUESTED" | "DISPATCHED" | "RECEIVED";
  sourceLocation: {
    id: number;
    name: string;
  };
  destinationLocation: {
    id: number;
    name: string;
  };
  item: {
    id: number;
    name: string;
    sku: string;
  };
  createdBy: {
    id: number;
    name: string;
    email: string;
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

const Transfers = () => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [transferNumber, setTransferNumber] = useState("");
  const [sourceLocationId, setSourceLocationId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchTransfers = async () => {
    try {
      const response = await api.get("/transfers");
      setTransfers(response.data.transfers);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load transfers"
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

      await Promise.all([fetchTransfers(), fetchFormData()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (sourceLocationId === destinationLocationId) {
      setError("Source and destination locations must be different.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      await api.post("/transfers", {
        transferNumber,
        sourceLocationId: Number(sourceLocationId),
        destinationLocationId: Number(destinationLocationId),
        itemId: Number(itemId),
        quantity: Number(quantity),
      });

      setSuccess("Transfer created successfully.");

      setTransferNumber("");
      setSourceLocationId("");
      setDestinationLocationId("");
      setItemId("");
      setQuantity("");

      await fetchTransfers();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to create transfer"
      );
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (
    id: number,
    status: "DISPATCHED" | "RECEIVED"
  ) => {
    try {
      setError("");
      setSuccess("");

      await api.patch(`/transfers/${id}/status`, {
        status,
      });

      setSuccess(
        status === "DISPATCHED"
          ? "Transfer dispatched successfully."
          : "Transfer received successfully."
      );

      await fetchTransfers();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to update transfer"
      );
    }
  };

  if (loading) {
    return <div className="page-container">Loading transfers...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Internal Transfers</h1>
          <p>Move stock between locations</p>
        </div>

        <button onClick={loadData}>Refresh</button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {(user.role === "ADMIN" || user.role === "OPERATIONS_USER") && (
        <div className="form-card">
          <h2>Create Transfer</h2>

          <form onSubmit={createTransfer} className="transfer-form">
            <div>
              <label>Transfer Number</label>
              <input
                type="text"
                value={transferNumber}
                onChange={(e) => setTransferNumber(e.target.value)}
                placeholder="TR-002"
                required
              />
            </div>

            <div>
              <label>Source Location</label>
              <select
                value={sourceLocationId}
                onChange={(e) => setSourceLocationId(e.target.value)}
                required
              >
                <option value="">Select source</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Destination Location</label>
              <select
                value={destinationLocationId}
                onChange={(e) =>
                  setDestinationLocationId(e.target.value)
                }
                required
              >
                <option value="">Select destination</option>
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
                placeholder="10"
                required
              />
            </div>

            <button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Transfer"}
            </button>
          </form>
        </div>
      )}

      {!error && transfers.length === 0 && (
        <div className="empty-message">No transfers found.</div>
      )}

      {!error && transfers.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Transfer ID</th>
                <th>Item</th>
                <th>From</th>
                <th>To</th>
                <th>Quantity</th>
                <th>Created By</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td>{transfer.transferNumber}</td>

                  <td>
                    {transfer.item.name}
                    <br />
                    <small>{transfer.item.sku}</small>
                  </td>

                  <td>{transfer.sourceLocation.name}</td>

                  <td>{transfer.destinationLocation.name}</td>

                  <td>{transfer.quantity}</td>

                  <td>{transfer.createdBy.name}</td>

                  <td>
                    <span
                      className={`status ${transfer.status.toLowerCase()}`}
                    >
                      {transfer.status}
                    </span>
                  </td>

                  <td>
                    {(user.role === "ADMIN" ||
                      user.role === "OPERATIONS_USER") &&
                      transfer.status === "REQUESTED" && (
                        <button
                          onClick={() =>
                            updateStatus(transfer.id, "DISPATCHED")
                          }
                        >
                          Dispatch
                        </button>
                      )}

                    {(user.role === "ADMIN" ||
                      user.role === "OPERATIONS_USER") &&
                      transfer.status === "DISPATCHED" && (
                        <button
                          onClick={() =>
                            updateStatus(transfer.id, "RECEIVED")
                          }
                        >
                          Receive
                        </button>
                      )}

                    {transfer.status === "RECEIVED" && (
                      <span>Received</span>
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

export default Transfers;