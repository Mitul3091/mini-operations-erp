import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isAdmin = user.role === "ADMIN";
  const isOperations = user.role === "OPERATIONS_USER";
  const isSales = user.role === "SALES_USER";

  const cards = [
    {
      title: "Inventory",
      description: "View physical, reserved and available stock.",
      path: "/inventory",
      icon: "INV",
      visible: true,
    },
    {
      title: "Work Orders",
      description: "Manage work orders and operational shortages.",
      path: "/work-orders",
      icon: "WO",
      visible: isAdmin || isOperations,
    },
    {
      title: "Internal Transfers",
      description: "Move stock between warehouse locations.",
      path: "/transfers",
      icon: "TR",
      visible: isAdmin || isOperations,
    },
    {
      title: "Customer Orders",
      description: "Create orders and reserve available stock.",
      path: "/orders",
      icon: "CO",
      visible: isAdmin || isSales,
    },
  ];

  const visibleCards = cards.filter((card) => card.visible);

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <span className="dashboard-label">DASHBOARD</span>
          <h1>Welcome back, {user.name || "User"}</h1>
          <p>
            Manage your operations from one place.
          </p>
        </div>

        <div className="role-badge">
          {user.role || "USER"}
        </div>
      </div>

      <div className="dashboard-grid">
        {visibleCards.map((card) => (
          <div
            key={card.path}
            className="dashboard-module-card"
            onClick={() => navigate(card.path)}
          >
            <div className="module-icon">{card.icon}</div>

            <div className="module-content">
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </div>

            <span className="module-arrow">→</span>
          </div>
        ))}
      </div>

      <div className="dashboard-info">
        <h2>Your Access</h2>

        <div className="access-grid">
          <div className="access-item">
            <strong>Inventory</strong>
            <span>View stock</span>
          </div>

          <div className="access-item">
            <strong>Work Orders</strong>
            <span>
              {isAdmin || isOperations ? "Available" : "Restricted"}
            </span>
          </div>

          <div className="access-item">
            <strong>Transfers</strong>
            <span>
              {isAdmin || isOperations ? "Available" : "Restricted"}
            </span>
          </div>

          <div className="access-item">
            <strong>Customer Orders</strong>
            <span>
              {isAdmin || isSales ? "Available" : "Restricted"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;