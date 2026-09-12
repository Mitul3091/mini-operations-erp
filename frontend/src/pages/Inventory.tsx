import { useEffect, useState } from "react";
import api from "../services/api";

type InventoryItem = {
  id: number;
  itemId: number;
  locationId: number;
  batchId: number | null;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  item: {
    name: string;
    sku: string;
  };
  location: {
    name: string;
  };
  batch: {
    batchNumber: string;
  } | null;
};

const Inventory = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const canManageInventory =
    user.role === "ADMIN" || user.role === "OPERATIONS_USER";

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/inventory");
      setInventory(response.data.inventory);
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to load inventory"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  if (loading) {
    return <div className="page-container">Loading inventory...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>View current stock across all locations</p>
        </div>

        <button onClick={fetchInventory}>Refresh</button>
      </div>

      <div className="access-notice">
        {canManageInventory
          ? "You have permission to manage inventory."
          : "You have view-only access to inventory."}
      </div>

      {error && <div className="error-message">{error}</div>}

      {!error && inventory.length === 0 && (
        <div className="empty-message">No inventory found.</div>
      )}

      {!error && inventory.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>SKU</th>
                <th>Location</th>
                <th>Batch</th>
                <th>Physical</th>
                <th>Reserved</th>
                <th>Available</th>
              </tr>
            </thead>

            <tbody>
              {inventory.map((stock) => (
                <tr key={stock.id}>
                  <td>{stock.item.name}</td>
                  <td>{stock.item.sku}</td>
                  <td>{stock.location.name}</td>
                  <td>{stock.batch?.batchNumber || "—"}</td>
                  <td>{stock.physicalQuantity}</td>
                  <td>{stock.reservedQuantity}</td>
                  <td>
                    <strong>{stock.availableQuantity}</strong>
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

export default Inventory;