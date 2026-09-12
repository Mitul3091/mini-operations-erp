import { NavLink, Outlet, useNavigate } from "react-router-dom";

const Layout = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const getLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav-link active" : "nav-link";

  const isAdmin = user.role === "ADMIN";
  const isOperations = user.role === "OPERATIONS_USER";
  const isSales = user.role === "SALES_USER";

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Mini ERP</h1>
          <span>Operations System</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={getLinkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/inventory" className={getLinkClass}>
            Inventory
          </NavLink>

          {(isAdmin || isOperations) && (
            <NavLink to="/work-orders" className={getLinkClass}>
              Work Orders
            </NavLink>
          )}

          {(isAdmin || isOperations) && (
            <NavLink to="/transfers" className={getLinkClass}>
              Internal Transfers
            </NavLink>
          )}

          {(isAdmin || isSales) && (
            <NavLink to="/orders" className={getLinkClass}>
              Customer Orders
            </NavLink>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <strong>{user.name || "User"}</strong>
            <span>{user.role || "Unknown Role"}</span>
          </div>

          <button className="logout-button" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <h2>Mini Operations ERP</h2>
            <p>Inventory and Operations Management</p>
          </div>

          <div className="topbar-user">
            <strong>{user.name || "User"}</strong>
            <span>{user.role || "Unknown Role"}</span>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;