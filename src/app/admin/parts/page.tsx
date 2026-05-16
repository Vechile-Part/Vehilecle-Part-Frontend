"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

const API = API_BASE_URL;

const getAuthHeaders = () => {
    const token = localStorage.getItem("authToken");
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
};

export default function AdminPartsPage() {
    const [parts, setParts] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    const [filterCategory, setFilterCategory] = useState("All");
    const [sortOrder, setSortOrder] = useState("none"); // "none", "highToLow", "lowToHigh"
    const [filterLowStock, setFilterLowStock] = useState(false);

    const [newPart, setNewPart] = useState({ name: "", partNumber: "", category: "", quantityInStock: "", unitPrice: "" });

    useEffect(() => {
        loadParts();
    }, []);

    const loadParts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/admin/parts`, { headers: getAuthHeaders() });
            if (res.ok) {
                const data = await res.json();
                setParts(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Failed to load parts", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const res = await fetch(`${API}/api/admin/parts`, {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...newPart,
                    quantityInStock: Number(newPart.quantityInStock),
                    unitPrice: Number(newPart.unitPrice)
                })
            });
            if (res.ok) {
                setShowModal(false);
                loadParts();
                setNewPart({ name: "", partNumber: "", category: "", quantityInStock: "", unitPrice: "" });
            }
        } catch (err) {
            alert("Failed to save part");
        }
    };

    let filteredParts = parts.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
            p.partNumber?.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = filterCategory === "All" || p.category === filterCategory;
        const matchesLowStock = filterLowStock ? Number(p.quantityInStock) <= 5 : true;
        return matchesSearch && matchesCategory && matchesLowStock;
    });

    if (sortOrder === "highToLow") {
        filteredParts = [...filteredParts].sort((a, b) => b.unitPrice - a.unitPrice);
    } else if (sortOrder === "lowToHigh") {
        filteredParts = [...filteredParts].sort((a, b) => a.unitPrice - b.unitPrice);
    }

    const categories = ["All", ...new Set(parts.map(p => p.category).filter(Boolean))];
    const totalValue = parts.reduce((acc, p) => acc + (Number(p.unitPrice) * Number(p.quantityInStock)), 0);
    const lowStockCount = parts.filter(p => Number(p.quantityInStock) <= 5).length;

    return (
        <main className="layout-main" style={{ padding: '40px' }}>
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h2 style={{ margin: 0, color: '#3d2817' }}>Add New Part</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
                        </div>
                        <div className="form-grid">
                            <input className="form-input" placeholder="Part Name" value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} />
                            <input className="form-input" placeholder="SKU / Part Number" value={newPart.partNumber} onChange={e => setNewPart({...newPart, partNumber: e.target.value})} />
                            <input className="form-input" placeholder="Category" value={newPart.category} onChange={e => setNewPart({...newPart, category: e.target.value})} />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <input className="form-input" placeholder="Quantity" value={newPart.quantityInStock} onChange={e => setNewPart({...newPart, quantityInStock: e.target.value})} />
                                <input className="form-input" placeholder="Price" value={newPart.unitPrice} onChange={e => setNewPart({...newPart, unitPrice: e.target.value})} />
                            </div>
                            <button className="form-button" onClick={handleSave}>Save Part to Inventory</button>
                        </div>
                    </div>
                </div>
            )}

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
                <div>
                    <h1 className="form-title" style={{ fontSize: '28px', margin: 0, color: '#3d2817' }}>Admin Inventory List</h1>
                    <p className="form-subtitle">Manage your stock levels, SKUs, and pricing in real-time.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="filter-dropdown-container">
                        <button
                            className="form-button secondary"
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                            style={{ width: 'auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            Filter <span>▼</span>
                        </button>

                        {showFilterDropdown && (
                            <div className="filter-dropdown-menu">
                                <div style={{ padding: '8px', fontSize: '11px', fontWeight: '700', color: '#8a7358', textTransform: 'uppercase' }}>Categories</div>
                                {categories.map(cat => (
                                    <div
                                        key={cat}
                                        className={`filter-dropdown-item ${filterCategory === cat ? 'active' : ''}`}
                                        onClick={() => { setFilterCategory(cat); setShowFilterDropdown(false); }}
                                    >
                                        {cat}
                                    </div>
                                ))}
                                <div style={{ borderTop: '1px solid #eadfcd', margin: '8px 0' }}></div>
                                <div style={{ padding: '8px', fontSize: '11px', fontWeight: '700', color: '#8a7358', textTransform: 'uppercase' }}>Sort by Price</div>
                                <div
                                    className={`filter-dropdown-item ${sortOrder === 'highToLow' ? 'active' : ''}`}
                                    onClick={() => { setSortOrder(sortOrder === 'highToLow' ? 'none' : 'highToLow'); setShowFilterDropdown(false); }}
                                >
                                    Highest to Lowest {sortOrder === 'highToLow' && "✓"}
                                </div>
                                <div
                                    className={`filter-dropdown-item ${sortOrder === 'lowToHigh' ? 'active' : ''}`}
                                    onClick={() => { setSortOrder(sortOrder === 'lowToHigh' ? 'none' : 'lowToHigh'); setShowFilterDropdown(false); }}
                                >
                                    Lowest to Highest {sortOrder === 'lowToHigh' && "✓"}
                                </div>
                                <div style={{ borderTop: '1px solid #eadfcd', margin: '8px 0' }}></div>
                                <div
                                    className={`filter-dropdown-item ${filterLowStock ? 'active' : ''}`}
                                    onClick={() => { setFilterLowStock(!filterLowStock); setShowFilterDropdown(false); }}
                                >
                                    Low Stock Only {filterLowStock && "✓"}
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="form-button" onClick={() => setShowModal(true)} style={{ width: 'auto', padding: '10px 24px' }}>+ New Part</button>
                </div>
            </header>

            <div className="form-card inventory-container" style={{ maxWidth: 'none', border: '1px solid #eadfcd', borderRadius: '12px' }}>
                <div className="inventory-table-header" style={{ background: '#fdfbf7' }}>
                    <input
                        className="form-input"
                        placeholder="Search by Part Name or SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: '440px', background: 'white' }}
                    />
                </div>

                <table className="inventory-table">
                    <thead>
                    <tr>
                        <th style={{ width: '35%' }}>Part Name</th>
                        <th>SKU</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {loading ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '60px' }}>Loading inventory...</td></tr>
                    ) : filteredParts.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '60px' }}>No parts found.</td></tr>
                    ) : filteredParts.map((p) => (
                        <tr key={p.id}>
                            <td>
                                <div className="part-info">
                                    <div className="part-icon-box">
                                        <img
                                            src={`/assets/${p.partNumber}.png`}
                                            alt={p.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    </div>
                                    <div style={{ marginLeft: '4px' }}>
                                        <div className="part-name" style={{ fontSize: '15px' }}>{p.name}</div>
                                        <div className="part-category">High-performance assembly</div>
                                    </div>
                                </div>
                            </td>
                            <td style={{ color: '#5f4d38', fontSize: '13px', fontWeight: '700' }}>{p.partNumber}</td>
                            <td><span className="role-badge">{p.category || 'General'}</span></td>
                            <td>
                                {Number(p.quantityInStock) <= 5 ? (
                                    <div style={{ color: '#c63121', fontWeight: '700' }}>
                                        <div>{p.quantityInStock} Units</div>
                                        <div style={{ fontSize: '10px', textTransform: 'uppercase' }}>Low Stock</div>
                                    </div>
                                ) : (
                                    <div style={{ color: '#2f2418' }}>{p.quantityInStock} Units</div>
                                )}
                            </td>
                            <td style={{ fontWeight: '600', color: '#1f140b' }}>Rs. {Number(p.unitPrice).toLocaleString()}</td>
                            <td>
                                <button className="action-btn" style={{ color: '#3d2817' }}>Edit</button>
                                <button className="action-btn" style={{ color: '#8f3d2b' }}>Delete</button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-card-label">Total Stock Value</div>
                    <div className="summary-card-value">Rs. {totalValue.toLocaleString()}</div>
                </div>
                <div className="summary-card alert">
                    <div className="summary-card-label">Low Stock Alerts</div>
                    <div className="summary-card-value">{lowStockCount} Items</div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-label">Daily Orders</div>
                    <div className="summary-card-value">0 Pending</div>
                </div>
            </div>
        </main>
    );
}
