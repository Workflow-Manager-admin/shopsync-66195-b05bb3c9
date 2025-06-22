import React, { useState, useEffect, useMemo, createContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import "./App.css";

// --------------------------- Context & Mock Backend ---------------------------

// PUBLIC_INTERFACE
export const ShopSyncContext = createContext({});

// Simple in-memory mock "backend"
const mockUsers = [{ username: "admin", password: "admin", role: "admin" }, { username: "staff", password: "staff", role: "staff" }];
const initialCategories = [
  { id: 1, name: "Beverages" },
  { id: 2, name: "Snacks" },
  { id: 3, name: "Others" }
];
const initialItems = [
  { id: 1, name: "Apple Juice", category: 1, quantity: 25, price: 2, description: "Refreshingly sweet.", barcode: "001122" },
  { id: 2, name: "Orange Chips", category: 2, quantity: 6, price: 1.5, description: "Crunchy & tangy.", barcode: "002233" },
  { id: 3, name: "Nut Mix", category: 3, quantity: 2, price: 3, description: "Healthy bundle.", barcode: "003344" }
];
const initialSales = [
  { id: 1, itemId: 1, quantity: 2, price: 4, timestamp: Date.now() - 1000 * 60 * 60 },
  { id: 2, itemId: 2, quantity: 1, price: 1.5, timestamp: Date.now() - 1000 * 40 }
];

// PUBLIC_INTERFACE
function ShopSyncProvider({ children }) {
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState(initialCategories);
  const [items, setItems] = useState(initialItems);
  const [sales, setSales] = useState(initialSales);
  const [alerts, setAlerts] = useState([]);
  // For polling simulation (real-time)
  useEffect(() => {
    const pollId = setInterval(() => {
      checkLowStock();
    }, 5000);
    return () => clearInterval(pollId);
    // eslint-disable-next-line
  }, [items]);
  // Low-stock checker (simulate real-time)
  function checkLowStock() {
    const lowStock = items.filter((item) => item.quantity <= 5)
      .map((item) => `Low stock: ${item.name} (${item.quantity} left)`);
    setAlerts(lowStock);
  }

  // Item CRUD
  function addItem(item) {
    setItems([...items, { ...item, id: Date.now() }]);
  }
  function updateItem(itemId, updates) {
    setItems(items.map(i => (i.id === itemId ? { ...i, ...updates } : i)));
  }
  function deleteItem(itemId) {
    setItems(items.filter(i => i.id !== itemId));
  }
  // Category CRUD
  function addCategory(cat) {
    setCategories([...categories, { ...cat, id: Date.now() }]);
  }
  function updateCategory(catId, updates) {
    setCategories(categories.map(c => (c.id === catId ? { ...c, ...updates } : c)));
  }
  function deleteCategory(catId) {
    // Remove category assignment from items
    setItems(items.map(it => it.category === catId ? { ...it, category: null } : it));
    setCategories(categories.filter(c => c.id !== catId));
  }
  // Sale actions
  function recordSale(itemId, quantity) {
    const item = items.find(i => i.id === itemId);
    if (item && item.quantity >= quantity) {
      updateItem(itemId, { quantity: item.quantity - quantity });
      setSales([
        ...sales,
        { id: Date.now(), itemId, quantity, price: item.price * quantity, timestamp: Date.now() }
      ]);
    }
  }
  // Auth (Mock)
  function login(username, password) {
    const u = mockUsers.find((u) => u.username === username && u.password === password);
    setUser(u ? { username: u.username, role: u.role } : null);
    return !!u;
  }
  function logout() {
    setUser(null);
  }
  // Barcode
  function findItemByBarcode(barcode) {
    return items.find(i => i.barcode === barcode);
  }
  // CSV Export (generates text and triggers download)
  function exportInventoryCSV() {
    const header = "ID,Name,Category,Quantity,Price,Description";
    const rows = items.map(it => [
      it.id, `"${it.name}"`, 
      categories.find(cat => cat.id === it.category)?.name || "", 
      it.quantity, it.price, `"${it.description}"`
    ].join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], {type: "text/csv"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "inventory.csv";
    a.click();
  }

  // Memoize value for performance except when any dep changes
  const value = useMemo(
    () => ({
      user, categories, items, sales, alerts,
      setUser, addItem, updateItem, deleteItem,
      addCategory, updateCategory, deleteCategory,
      recordSale, login, logout, findItemByBarcode,
      exportInventoryCSV
    }),
    [user, categories, items, sales, alerts]
  );
  return (
    <ShopSyncContext.Provider value={value}>{children}</ShopSyncContext.Provider>
  );
}

// ----------------------------- Layout Components -----------------------------

function Topbar() {
  const { user, logout, alerts } = React.useContext(ShopSyncContext);
  const nav = useNavigate();
  return (
    <div className="shopsync-topbar" style={topbarStyles}>
      <div className="topbar-left">
        <span className="logo" style={{ color: "#4CAF50", fontWeight: 700, fontSize: "1.2rem" }}>ShopSync</span>
      </div>
      <div className="topbar-mid">
        {alerts.length > 0 &&
          <span className="topbar-alerts">{alerts.map((al,idx) => (
            <span key={idx} style={alertStyles}><b>Alert:</b> {al}</span>
          ))}</span>}
      </div>
      <div className="topbar-right">
        {user ? (
          <span>
            <span style={{ marginRight: 12, color: "#444" }}>
              <b>{user.username}</b> ({user.role})
            </span>
            <button className="btn" style={btnStyles} onClick={() => { logout(); nav("/auth"); }}>Logout</button>
          </span>
        ) : ""}
      </div>
    </div>
  );
}

function Sidebar() {
  const { user } = React.useContext(ShopSyncContext);
  const [open, setOpen] = useState(window.innerWidth > 900);
  useEffect(() => {
    function syncSidebar() {
      setOpen(window.innerWidth > 900);
    }
    window.addEventListener("resize", syncSidebar);
    return () => window.removeEventListener("resize", syncSidebar);
  }, []);
  if (!user) return null;
  return (
    <div className="shopsync-sidebar" style={{ ...sidebarStyles, left: open ? 0 : -180 }}>
      <NavLink icon="📊" label="Dashboard" to="/dashboard" />
      <NavLink icon="📦" label="Inventory" to="/inventory" />
      <NavLink icon="🗂️" label="Categories" to="/categories" />
      <NavLink icon="💸" label="Sales" to="/sales" />
      <NavLink icon="🔍" label="Scan" to="/barcode" />
      <NavLink icon="📋" label="Reports" to="/reports" />
    </div>
  );
}
function NavLink({ icon, label, to }) {
  const nav = useNavigate();
  const active = window.location.pathname === to;
  return (
    <div className="sidebar-link" style={{ ...navlinkStyles, background: active ? "#e5f5ec" : "none" }}
      onClick={() => nav(to)}>
      <span style={{ fontSize: 20 }}>{icon}</span> <span>{label}</span>
    </div>
  );
}
const sidebarStyles = {
  position: "fixed", top: 56, left: 0, bottom: 0, width: 180,
  background: "#fff", borderRight: "1px solid #eee", paddingTop: 24, zIndex: 10,
  display: "flex", flexDirection: "column", gap: 4, boxShadow: "2px 0 4px #ddd"
};
const navlinkStyles = {
  display: "flex",
  alignItems: "center", gap: 8, padding: "10px 20px", fontWeight: 500,
  color: "#4CAF50", cursor: "pointer", borderRadius: 6,
  marginRight: 10, marginLeft: 0, transition: "background .18s"
};
const topbarStyles = {
  position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "#f5f5f5",
  borderBottom: "1px solid #eee", display: "flex", alignItems: "center",
  justifyContent: "space-between", zIndex: 15, padding: "0 20px"
};
const btnStyles = { background: "#4CAF50", color: "#fff", border: "none", borderRadius: 4, padding: "7px 17px", fontWeight: 600, cursor: "pointer" };
const alertStyles = { background: "#FFF3CD", color: "#856404", padding: "2px 10px", borderRadius: 6, marginLeft: 12, fontSize: "0.97em" };

// ------------------------------ Page Components ------------------------------

function DashboardPage() {
  const { items, categories, sales } = React.useContext(ShopSyncContext);
  const lowStock = items.filter(i => i.quantity <= 5);
  const recentSales = sales.slice(-5).map(sale => ({
    ...sale, item: items.find(i => i.id === sale.itemId)
  })).reverse();
  return (
    <div style={pageStyles.main}>
      <h2>Dashboard</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <SummaryCard title="Total Items" value={items.length} icon="📦" color="#2196F3"/>
        <SummaryCard title="Total Categories" value={categories.length} icon="🗂️" color="#4CAF50"/>
        <SummaryCard title="Total Sales" value={sales.length} icon="💰" color="#FFC107"/>
      </div>
      <div style={{ marginTop: 32 }}>
        <h3>Low Stock Alerts</h3>
        {lowStock.length === 0 ? <p>All items in healthy stock!</p> :
        <ul>{lowStock.map(item => (
          <li key={item.id} style={{color:"#e57373"}}>
            {item.name}: <b>{item.quantity} left</b>
          </li>
        ))}</ul>}
      </div>
      <div style={{marginTop:32}}>
        <h3>Recent Sales</h3>
        {recentSales.length === 0 ? <p>No recent sales.</p> :
        <table style={tableStyles.table}><thead>
          <tr><th>Item</th><th>Qty</th><th>Price</th><th>Time</th></tr></thead>
          <tbody>
            {recentSales.map(s => (
              <tr key={s.id}><td>{s.item?.name || "?"}</td><td>{s.quantity}</td><td>${s.price}</td>
              <td>{timeAgo(s.timestamp)}</td></tr>
            ))}
          </tbody>
        </table>}
      </div>
    </div>
  );
}
function SummaryCard({ title, value, icon, color }) {
  return (
    <div style={{ minWidth: 160, flex: 1, borderRadius: 12, background: "#fff", color: color, 
      boxShadow: "0 1px 6px #f3f3f3", padding: 22, display:"flex",alignItems:"center",gap:12 }}>
      <span style={{ fontSize: 32 }}>{icon}</span>
      <span><b style={{ fontSize: 20 }}>{value}</b><br />
        <span style={{color: "#555", fontWeight: 500}}>{title}</span>
      </span>
    </div>
  );
}
function InventoryPage() {
  const { items, categories, addItem, updateItem, deleteItem } = React.useContext(ShopSyncContext);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  function filterItems() {
    return items.filter(i =>
      [i.name, i.description, categories.find(c=>c.id===i.category)?.name]
      .join(" ").toLowerCase().includes(search.toLowerCase())
    );
  }
  return (
    <div style={pageStyles.main}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h2>Inventory</h2>
        <button style={btnStyles} onClick={() => setShowAdd(true)}>Add Item</button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
        style={formFieldStyles} />
      <table style={tableStyles.table}><thead>
        <tr>
          <th>Name</th><th>Category</th><th>Qty</th><th>Price</th>
          <th>Barcode</th><th>Actions</th>
        </tr>
      </thead>
        <tbody>
        {filterItems().map(item =>
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{categories.find(c=>c.id===item.category)?.name||"—"}</td>
            <td>{item.quantity}</td>
            <td>${item.price}</td>
            <td>{item.barcode}</td>
            <td>
              <button onClick={()=>setEditing(item)} style={{...btnStyles, background:"#2196F3"}}>Edit</button>
              <button onClick={()=>deleteItem(item.id)} style={{...btnStyles, background:"#e57373", marginLeft:7}}>Delete</button>
            </td>
          </tr>
        )}
        </tbody>
      </table>
      {(editing || showAdd) &&
        <ItemForm
          item={editing}
          onDismiss={()=>{setEditing(null);setShowAdd(false);}}
          onSave={itm=>{
            editing ? updateItem(editing.id, itm) : addItem(itm);
            setEditing(null);setShowAdd(false);
          }}
          categories={categories}
        />}
    </div>
  );
}
function ItemForm({ item, categories, onDismiss, onSave }) {
  const [form, setForm] = useState(item ? { ...item } : {
    name:"", category: categories[0]?.id || null, quantity:0, price:0, description:"", barcode:""
  });
  return (
    <div style={modalStyles.cover}>
      <div style={modalStyles.window}>
        <h3>{item ? "Edit Item" : "Add Item"}</h3>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <input placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={formFieldStyles}/>
          <select value={form.category} onChange={e=>setForm(f=>({...f,category:+e.target.value}))}
            style={formFieldStyles}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input placeholder="Qty" type="number" min="0"
            value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:+e.target.value}))}
            style={formFieldStyles}/>
          <input placeholder="Price" type="number" min="0"
            value={form.price} onChange={e=>setForm(f=>({...f,price:+e.target.value}))}
            style={formFieldStyles}/>
          <input placeholder="Barcode/QR" value={form.barcode} onChange={e=>setForm(f=>({...f,barcode:e.target.value}))}
            style={formFieldStyles}/>
        </div>
        <textarea placeholder="Description" value={form.description} 
          onChange={e=>setForm(f=>({...f,description:e.target.value}))}
          rows={2} style={formFieldStyles}/>
        <div style={{textAlign:"right",marginTop:10}}>
          <button style={btnStyles} onClick={()=>onSave(form)}>{item ? "Save" : "Add"}</button>
          <button style={{...btnStyles, background:"#eee", color:"#333", marginLeft: 8}} onClick={onDismiss}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = React.useContext(ShopSyncContext);
  const [editing, setEditing] = useState(null);
  const [add, setAdd] = useState(false);
  const [filter, setFilter] = useState("");
  return (
    <div style={pageStyles.main}>
      <div style={{display:"flex", gap:12, alignItems:"center"}}>
        <h2>Categories</h2>
        <button style={btnStyles} onClick={()=>setAdd(true)}>Add</button>
        <input style={formFieldStyles} placeholder="Filter…" value={filter} onChange={e=>setFilter(e.target.value)} />
      </div>
      <table style={tableStyles.table}><thead>
        <tr><th>Name</th><th>Actions</th></tr>
      </thead>
      <tbody>
        {categories.filter(c=>c.name.toLowerCase().includes(filter.toLowerCase())).map(cat=>
          <tr key={cat.id}>
            <td>{cat.name}</td>
            <td>
              <button style={{...btnStyles, background:"#2196F3"}} onClick={()=>setEditing(cat)}>Edit</button>
              <button style={{...btnStyles, background:"#e57373", marginLeft:7}} onClick={()=>deleteCategory(cat.id)}>Delete</button>
            </td>
          </tr>
        )}
      </tbody>
      </table>
      {(editing || add) &&
        <CategoryForm
          category={editing}
          onDismiss={()=>{setEditing(null);setAdd(false);}}
          onSave={c=>{
            editing ? updateCategory(editing.id, c) : addCategory(c); setEditing(null); setAdd(false);
          }}
        />}
    </div>
  );
}
function CategoryForm({ category, onDismiss, onSave }) {
  const [name, setName] = useState(category ? category.name : "");
  return (
    <div style={modalStyles.cover}>
      <div style={modalStyles.window}>
        <h3>{category ? "Edit Category" : "Add Category"}</h3>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name" style={formFieldStyles}/>
        <div style={{textAlign:"right",marginTop:10}}>
          <button style={btnStyles} onClick={()=>onSave({name})}>{category?"Save":"Add"}</button>
          <button style={{...btnStyles, background:"#eee", color:"#333", marginLeft: 8}} onClick={onDismiss}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
function SalesPage() {
  const { sales, items, recordSale } = React.useContext(ShopSyncContext);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  function handleSale(e){
    e.preventDefault();
    if(!itemId || qty<1)return;
    recordSale(+itemId, qty); setItemId(""); setQty(1);
  }
  return (
    <div style={pageStyles.main}>
      <h2>Sales History</h2>
      <form onSubmit={handleSale} style={{display:"flex", gap:8, alignItems:"center"}}>
        <select value={itemId} onChange={e=>setItemId(e.target.value)} style={formFieldStyles}>
          <option value="">Select Item</option>
          {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} left)</option>)}
        </select>
        <input type="number" min="1" value={qty} onChange={e=>setQty(+e.target.value)} style={formFieldStyles} placeholder="Qty"/>
        <button style={btnStyles}>Record Sale</button>
      </form>
      <div style={{marginTop:24}}>
        <table style={tableStyles.table}><thead>
          <tr><th>Item</th><th>Qty</th><th>Price</th><th>Timestamp</th></tr>
        </thead>
          <tbody>
            {sales.slice().reverse().map(sale => 
              <tr key={sale.id}>
                <td>{items.find(i=>i.id===sale.itemId)?.name || "?"}</td>
                <td>{sale.quantity}</td>
                <td>${sale.price}</td>
                <td>{timeAgo(sale.timestamp)}</td>
              </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function BarcodePage() {
  const { findItemByBarcode, updateItem, items } = React.useContext(ShopSyncContext);
  const [barcode, setBarcode] = useState("");
  const [found, setFound] = useState(null);
  function handleSearch() {
    const item = findItemByBarcode(barcode);
    setFound(item);
  }
  function simulateScan() {
    // Simulates “scanning”; real camera integration would use a library.
    const sample = items[Math.floor(Math.random()*items.length)]?.barcode;
    setBarcode(sample||""); if (sample) setFound(findItemByBarcode(sample));
  }
  function decreaseQty() {
    if(found) updateItem(found.id, { quantity: Math.max(found.quantity-1, 0) });
    setFound(found ? { ...found, quantity: Math.max(found.quantity-1, 0) } : null);
  }
  return (
    <div style={pageStyles.main}>
      <h2>Barcode/QR Lookup</h2>
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
        <input value={barcode} onChange={e=>setBarcode(e.target.value)}
          placeholder="Scan or type barcode…" style={formFieldStyles} />
        <button style={btnStyles} onClick={handleSearch}>Find</button>
        <button style={{ ...btnStyles, background: "#FFC107", color: "#222" }} onClick={simulateScan}>Simulate Scan</button>
      </div>
      {found ?
        <div style={modalStyles.window}>
          <h4>{found.name}</h4>
          <p>Category: {found.category}</p>
          <p>In Stock: <b>{found.quantity}</b></p>
          <button style={{ ...btnStyles, background: "#4CAF50" }}
            onClick={decreaseQty}>Sell 1</button>
        </div>
        : barcode ? <div>No item found for this barcode.</div> : ""}
    </div>
  );
}
function ReportsPage() {
  const { items, exportInventoryCSV } = React.useContext(ShopSyncContext);
  return (
    <div style={pageStyles.main}>
      <h2>Inventory Report</h2>
      <p>Export all inventory data for custom reporting or backup.</p>
      <button style={btnStyles} onClick={exportInventoryCSV}>Export as CSV</button>
      <div style={{marginTop:22}}>
        <h3>Preview</h3>
        <table style={tableStyles.table}><thead>
          <tr><th>Name</th><th>Category</th><th>Quantity</th><th>Price</th><th>Description</th></tr>
        </thead>
          <tbody>
            {items.map(item =>
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.category}</td>
                <td>{item.quantity}</td>
                <td>{item.price}</td>
                <td>{item.description}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// BASIC AUTH SIMULATION
function AuthPage() {
  const { user, login } = React.useContext(ShopSyncContext);
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  function handleLogin(e) {
    e.preventDefault();
    if (login(form.username, form.password)) {
      nav("/dashboard");
    } else {
      setError("Invalid credentials");
    }
  }
  useEffect(() => {
    if (user) nav("/dashboard");
    // eslint-disable-next-line
  }, [user]);
  return (
    <div style={{ ...pageStyles.center, minHeight: "calc(100vh - 56px)" }}>
      <form onSubmit={handleLogin} style={modalStyles.window}>
        <h2>Login to ShopSync</h2>
        <input placeholder="Username" autoFocus value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          style={formFieldStyles} />
        <input placeholder="Password" type="password"
          value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          style={formFieldStyles} />
        {error && <div style={{ color: "#e57373" }}>{error}</div>}
        <button style={btnStyles}>Login</button>
        <div style={{marginTop:10, fontSize:"0.93em", color:"#999"}}>
          (Demo: admin/admin, staff/staff)
        </div>
      </form>
    </div>
  );
}

// ------------------------------ UTILITIES & STYLES ------------------------------
const pageStyles = {
  main: { marginLeft: 200, padding: "88px 32px 32px 32px", minHeight: "90vh" },
  center: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }
};
const formFieldStyles = { margin: "6px 0", padding: 8, borderRadius: 4, border: "1px solid #ddd", fontSize: 16, minWidth: 120, outline: "none" };
const modalStyles = {
  cover: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(60,60,80,0.12)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  window: { background: "#fff", borderRadius: 9, padding: 28, boxShadow: "0 2px 8px #3332", maxWidth: 340, width: "100%", minWidth:240, margin: "0 auto", display:"flex",flexDirection:"column",gap:6 }
};
const tableStyles = {
  table: {
    width: "100%", background: "#f8fafd", borderCollapse: "collapse", borderRadius: 8, marginTop: 16
  }
};

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 0) return "now";
  const mins = Math.floor(seconds / 60);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + " mins ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + " hrs ago";
  const days = Math.floor(hrs / 24);
  return days + " days ago";
}

// ------------------------------- APP ROUTING ----------------------------------

function ProtectedRoute({ children }) {
  const { user } = React.useContext(ShopSyncContext);
  if (!user) return <Navigate to="/auth" />;
  return children;
}
function MainAppLayout() {
  return (
    <>
      <Topbar />
      <Sidebar />
      <div style={{ marginLeft: 180 }}>
        <Routes>
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
          <Route path="/categories" element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
          <Route path="/sales" element={<ProtectedRoute><SalesPage /></ProtectedRoute>} />
          <Route path="/barcode" element={<ProtectedRoute><BarcodePage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </>
  );
}

// ------------------------------- PUBLIC INTERFACE ------------------------------

/**
 * PUBLIC_INTERFACE
 * ShopSync App's main entry: wraps everything in context and handles routing/layout.
 */
function App() {
  return (
    <ShopSyncProvider>
      <Router>
        <MainAppLayout />
      </Router>
    </ShopSyncProvider>
  );
}
export default App;
