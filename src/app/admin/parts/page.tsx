"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatNpr } from "@/lib/currency";
import { apiFetch, extractApiError, isUuid, parseJsonSafe } from "@/lib/http";
import { partImageUrl, uploadPartImage } from "@/lib/partImage";

type Part = {
  id: string;
  name: string;
  partNumber: string;
  unitPrice: number;
  quantityInStock: number;
  vendorId: string;
  vendorName?: string;
  category: string;
  isLowStock?: boolean;
};

const CATEGORY_PRESETS = ["General", "Engine", "Brakes", "Electrical", "Filters", "Fluids", "Body"];

const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

const normalizeGuid = (value: string) => value.trim().toLowerCase();

type VendorOption = {
  id: string;
  name: string;
};

type PartForm = {
  name: string;
  partNumber: string;
  quantityInStock: string;
  unitPrice: string;
  vendorId: string;
  category: string;
};

const emptyForm: PartForm = {
  name: "",
  partNumber: "",
  quantityInStock: "",
  unitPrice: "",
  vendorId: "",
  category: "General",
};

const parseVendorId = (raw: unknown): string => {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object") {
    const row = raw as Record<string, unknown>;
    return String(row.id ?? row.Id ?? "").trim();
  }
  return String(raw).trim();
};

const attachVendorName = (part: Part, vendorById: Map<string, string>, soleVendorName?: string): Part => {
  if (part.vendorName?.trim()) return part;
  const id = normalizeGuid(part.vendorId);
  if (id && id !== EMPTY_GUID) {
    const name = vendorById.get(id);
    if (name) return { ...part, vendorName: name };
  }
  if (soleVendorName) return { ...part, vendorName: soleVendorName };
  return part;
};

const normalizePart = (record: Record<string, unknown>): Part | null => {
  const id = String(record.id ?? record.Id ?? "");
  if (!id) return null;
  return {
    id,
    name: String(record.name ?? record.Name ?? ""),
    partNumber: String(record.partNumber ?? record.PartNumber ?? ""),
    unitPrice: Number(record.unitPrice ?? record.UnitPrice ?? 0),
    quantityInStock: Number(record.quantityInStock ?? record.QuantityInStock ?? 0),
    vendorId: parseVendorId(record.vendorId ?? record.VendorId),
    vendorName: String(record.vendorName ?? record.VendorName ?? "").trim() || undefined,
    category: String(record.category ?? record.Category ?? "General").trim() || "General",
    isLowStock: Boolean(record.isLowStock ?? record.IsLowStock ?? false),
  };
};

const normalizeVendor = (record: Record<string, unknown>): VendorOption | null => {
  const id = String(record.id ?? record.Id ?? "");
  if (!id) return null;
  return {
    id,
    name: String(record.name ?? record.Name ?? "Vendor"),
  };
};

export default function AdminPartsPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [filterCategory, setFilterCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState<"none" | "highToLow" | "lowToHigh">("none");
  const [filterLowStock, setFilterLowStock] = useState(false);

  const [form, setForm] = useState<PartForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const clearImageSelection = useCallback(() => {
    setImagePreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
    setImageFile(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, []);

  const loadVendors = useCallback(async () => {
    try {
      const res = await apiFetch("/api/vendors");
      const data = await parseJsonSafe(res);
      if (res.ok && Array.isArray(data)) {
        setVendors(
          data
            .map((row) => normalizeVendor(row as Record<string, unknown>))
            .filter((row): row is VendorOption => row !== null),
        );
      }
    } catch {
      setVendors([]);
    }
  }, []);

  const loadParts = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    try {
      const [partsRes, vendorsRes] = await Promise.all([
        apiFetch("/api/admin/parts"),
        apiFetch("/api/vendors"),
      ]);
      const data = await parseJsonSafe(partsRes);
      const vendorData = await parseJsonSafe(vendorsRes);
      const vendorList =
        vendorsRes.ok && Array.isArray(vendorData)
          ? vendorData
              .map((row) => normalizeVendor(row as Record<string, unknown>))
              .filter((row): row is VendorOption => row !== null)
          : [];
      setVendors(vendorList);

      const vendorById = new Map(vendorList.map((vendor) => [normalizeGuid(vendor.id), vendor.name]));
      const soleVendorName = vendorList.length === 1 ? vendorList[0].name : undefined;

      if (!vendorsRes.ok) {
        setStatus({
          tone: "error",
          text: extractApiError(
            vendorData,
            "Could not load vendors. Vendor names may be missing until you refresh or sign in as admin.",
          ),
        });
      }

      const mapParts = (rows: unknown[]) =>
        rows
          .map((row) => normalizePart(row as Record<string, unknown>))
          .filter((row): row is Part => row !== null)
          .map((part) => attachVendorName(part, vendorById, soleVendorName));

      if (partsRes.ok) {
        if (data && typeof data === "object" && "items" in data && Array.isArray((data as { items: unknown[] }).items)) {
          setParts(mapParts((data as { items: unknown[] }).items));
        } else if (Array.isArray(data)) {
          setParts(mapParts(data));
        } else {
          setParts([]);
        }
      } else {
        setParts([]);
        setStatus({
          tone: "error",
          text: extractApiError(data, "Could not load parts. Check that you are signed in as admin."),
        });
      }
    } catch {
      setParts([]);
      setStatus({ tone: "error", text: "Network error while loading parts." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadParts();
  }, [loadParts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);

  const vendorById = useMemo(
    () => new Map(vendors.map((vendor) => [normalizeGuid(vendor.id), vendor.name])),
    [vendors],
  );

  const resolveVendorLabel = (part: Part) => {
    if (part.vendorName?.trim()) return part.vendorName;
    const id = normalizeGuid(part.vendorId);
    if (id && id !== EMPTY_GUID) {
      const fromMap = vendorById.get(id);
      if (fromMap) return fromMap;
    }
    return "—";
  };

  const openAdd = () => {
    clearImageSelection();
    setEditingId(null);
    setForm({
      ...emptyForm,
      vendorId: vendors[0]?.id ?? "",
      category: "General",
    });
    setShowModal(true);
  };

  const openEdit = (part: Part) => {
    clearImageSelection();
    setEditingId(part.id);
    setForm({
      name: part.name,
      partNumber: part.partNumber,
      quantityInStock: String(part.quantityInStock),
      unitPrice: String(part.unitPrice),
      vendorId: part.vendorId || vendors[0]?.id || "",
      category: part.category || "General",
    });
    setImagePreview(partImageUrl(part.partNumber, imageVersion));
    setShowModal(true);
  };

  const closeModal = () => {
    clearImageSelection();
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const onImageFileChange = (file: File | null) => {
    clearImageSelection();
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setStatus({ tone: "error", text: "Use a PNG, JPEG, or WebP image." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus({ tone: "error", text: "Image must be 5 MB or smaller." });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setStatus(null);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const partNumber = form.partNumber.trim();
    const vendorId = form.vendorId.trim();

    if (!name || !partNumber) {
      setStatus({ tone: "error", text: "Part name and SKU are required." });
      return;
    }
    if (!isUuid(vendorId)) {
      setStatus({ tone: "error", text: "Select a valid vendor (create one under Vendors if the list is empty)." });
      return;
    }

    const quantityInStock = Number(form.quantityInStock);
    const unitPrice = Number(form.unitPrice);
    if (!Number.isFinite(quantityInStock) || quantityInStock < 0) {
      setStatus({ tone: "error", text: "Quantity must be zero or greater." });
      return;
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setStatus({ tone: "error", text: "Unit price must be greater than zero." });
      return;
    }

    setSaving(true);
    setStatus(null);

    const body = {
      name,
      partNumber,
      quantityInStock: Math.trunc(quantityInStock),
      unitPrice,
      vendorId,
      category: form.category.trim() || "General",
    };

    try {
      const res = editingId
        ? await apiFetch(`/api/admin/parts/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await apiFetch("/api/admin/parts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setStatus({
          tone: "error",
          text: extractApiError(data, editingId ? "Update failed." : "Could not add part."),
        });
        return;
      }

      if (imageFile) {
        const upload = await uploadPartImage(partNumber, imageFile);
        if (!upload.ok) {
          setStatus({
            tone: "error",
            text: `${editingId ? "Part saved" : "Part added"}, but image upload failed: ${upload.message}`,
          });
          setImageVersion((v) => v + 1);
          await loadParts();
          return;
        }
        setImageVersion((v) => v + 1);
      }

      setStatus({
        tone: "success",
        text: imageFile
          ? editingId
            ? "Part and image updated successfully."
            : "Part added with image."
          : editingId
            ? "Part updated successfully."
            : "Part added to inventory.",
      });
      closeModal();
      await loadParts();
    } catch {
      setStatus({ tone: "error", text: "Request failed. Check that the API is running." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (part: Part) => {
    if (!window.confirm(`Delete "${part.name}" (${part.partNumber})? This cannot be undone.`)) {
      return;
    }

    setStatus(null);
    try {
      const res = await apiFetch(`/api/admin/parts/${part.id}`, { method: "DELETE" });
      const data = await parseJsonSafe(res);
      if (!res.ok) {
        setStatus({
          tone: "error",
          text: extractApiError(
            data,
            "Delete failed. The part may still be linked to sales or purchase records.",
          ),
        });
        return;
      }
      setStatus({ tone: "success", text: `"${part.name}" was removed from inventory.` });
      await loadParts();
    } catch {
      setStatus({ tone: "error", text: "Delete request failed." });
    }
  };

  let filteredParts = parts.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q || p.name.toLowerCase().includes(q) || p.partNumber.toLowerCase().includes(q);
    const matchesCategory = filterCategory === "All" || p.category === filterCategory;
    const matchesLowStock = filterLowStock ? p.quantityInStock <= 5 : true;
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  if (sortOrder === "highToLow") {
    filteredParts = [...filteredParts].sort((a, b) => b.unitPrice - a.unitPrice);
  } else if (sortOrder === "lowToHigh") {
    filteredParts = [...filteredParts].sort((a, b) => a.unitPrice - b.unitPrice);
  }

  const categories = [
    "All",
    ...Array.from(
      new Set([...CATEGORY_PRESETS, ...parts.map((p) => p.category).filter(Boolean)]),
    ).sort(),
  ];

  const formCategoryOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...CATEGORY_PRESETS,
          ...parts.map((p) => p.category).filter(Boolean),
          form.category.trim() || "General",
        ]),
      ).sort(),
    [parts, form.category],
  );
  const totalValue = parts.reduce((acc, p) => acc + p.unitPrice * p.quantityInStock, 0);
  const lowStockCount = parts.filter((p) => p.quantityInStock <= 5).length;

  return (
    <main className="layout-main admin-page">
      {showModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="part-modal-title">
          <div className="modal-container">
            <div className="modal-header">
              <h2 id="part-modal-title" style={{ margin: 0, color: "#3d2817" }}>
                {editingId ? "Edit part" : "Add new part"}
              </h2>
              <button type="button" onClick={closeModal} style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer" }}>
                ×
              </button>
            </div>
            <div className="form-grid">
              <input
                className="form-input"
                placeholder="Part name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                className="form-input"
                placeholder="SKU / part number"
                value={form.partNumber}
                onChange={(e) => setForm({ ...form, partNumber: e.target.value })}
              />
              <label className="purchase-invoice-field" style={{ gap: 6 }}>
                <span style={{ fontWeight: 600, color: "#5a4733" }}>Part image (optional)</span>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="form-input"
                  onChange={(e) => onImageFileChange(e.target.files?.[0] ?? null)}
                />
                <span style={{ fontSize: "0.82rem", color: "#6f5a45" }}>
                  Saved as the SKU filename. PNG, JPEG, or WebP, max 5 MB.
                </span>
                {(imagePreview || form.partNumber.trim()) && (
                  <div
                    style={{
                      marginTop: 8,
                      width: 88,
                      height: 88,
                      borderRadius: 10,
                      border: "1px solid #dccbb1",
                      overflow: "hidden",
                      background: "#f5ead8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Part preview"
                        width={88}
                        height={88}
                        unoptimized
                        style={{ objectFit: "cover", width: "100%", height: "100%" }}
                      />
                    ) : (
                      <span style={{ fontSize: 11, color: "#8a7358", padding: 8, textAlign: "center" }}>
                        Preview after upload
                      </span>
                    )}
                  </div>
                )}
                {imageFile && (
                  <button type="button" className="action-btn" style={{ marginTop: 6 }} onClick={clearImageSelection}>
                    Remove image
                  </button>
                )}
              </label>
              <label className="purchase-invoice-field" style={{ gap: 6 }}>
                <span style={{ fontWeight: 600, color: "#5a4733" }}>Vendor</span>
                <select
                  className="form-input"
                  value={form.vendorId}
                  onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              {vendors.length === 0 && (
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#8f3d2b" }}>
                  No vendors found. Add a vendor first under Admin → Vendors.
                </p>
              )}
              <label className="purchase-invoice-field" style={{ gap: 6 }}>
                <span style={{ fontWeight: 600, color: "#5a4733" }}>Category</span>
                <select
                  className="form-input"
                  value={form.category || "General"}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {formCategoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-grid-two">
                <input
                  className="form-input"
                  placeholder="Quantity"
                  type="number"
                  min={0}
                  value={form.quantityInStock}
                  onChange={(e) => setForm({ ...form, quantityInStock: e.target.value })}
                />
                <input
                  className="form-input"
                  placeholder="Unit price (NPR)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                />
              </div>
              <button className="form-button" type="button" onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Save part to inventory"}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="admin-page-header">
        <div className="admin-page-header-text">
          <h1 className="admin-page-title">Admin Inventory List</h1>
          <p className="admin-page-subtitle">Manage stock levels, SKUs, pricing, and vendors.</p>
        </div>
        <div className="admin-page-actions">
          <div className="filter-dropdown-container">
            <button
              type="button"
              className="form-button secondary"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              style={{ width: "auto", padding: "10px 24px", display: "flex", alignItems: "center", gap: "8px" }}
            >
              Filter <span>▼</span>
            </button>

            {showFilterDropdown && (
              <div className="filter-dropdown-menu">
                <div style={{ padding: "8px", fontSize: "11px", fontWeight: "700", color: "#8a7358", textTransform: "uppercase" }}>
                  Category
                </div>
                {categories.map((cat) => (
                  <div
                    key={cat}
                    className={`filter-dropdown-item ${filterCategory === cat ? "active" : ""}`}
                    onClick={() => {
                      setFilterCategory(cat);
                      setShowFilterDropdown(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setFilterCategory(cat);
                        setShowFilterDropdown(false);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {cat}
                  </div>
                ))}
                <div style={{ borderTop: "1px solid #eadfcd", margin: "8px 0" }} />
                <div style={{ padding: "8px", fontSize: "11px", fontWeight: "700", color: "#8a7358", textTransform: "uppercase" }}>
                  Sort by price
                </div>
                <div
                  className={`filter-dropdown-item ${sortOrder === "highToLow" ? "active" : ""}`}
                  onClick={() => {
                    setSortOrder(sortOrder === "highToLow" ? "none" : "highToLow");
                    setShowFilterDropdown(false);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  Highest to lowest {sortOrder === "highToLow" && "✓"}
                </div>
                <div
                  className={`filter-dropdown-item ${sortOrder === "lowToHigh" ? "active" : ""}`}
                  onClick={() => {
                    setSortOrder(sortOrder === "lowToHigh" ? "none" : "lowToHigh");
                    setShowFilterDropdown(false);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  Lowest to highest {sortOrder === "lowToHigh" && "✓"}
                </div>
                <div style={{ borderTop: "1px solid #eadfcd", margin: "8px 0" }} />
                <div
                  className={`filter-dropdown-item ${filterLowStock ? "active" : ""}`}
                  onClick={() => {
                    setFilterLowStock(!filterLowStock);
                    setShowFilterDropdown(false);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  Low stock only {filterLowStock && "✓"}
                </div>
              </div>
            )}
          </div>
          <button type="button" className="form-button" onClick={openAdd} style={{ width: "auto", padding: "10px 24px" }}>
            + New part
          </button>
        </div>
      </header>

      {status && (
        <div
          className={`purchase-invoice-status ${status.tone}`}
          style={{ marginBottom: "20px", borderRadius: "12px", padding: "12px 16px" }}
        >
          {status.text}
        </div>
      )}

      <div className="form-card inventory-container" style={{ maxWidth: "none", border: "1px solid #eadfcd", borderRadius: "12px" }}>
        <div className="inventory-table-header" style={{ background: "#fdfbf7" }}>
          <input
            className="form-input inventory-search"
            placeholder="Search by part name or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="inventory-table-scroll">
        <table className="inventory-table">
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Part name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Vendor</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "60px" }}>
                  Loading inventory…
                </td>
              </tr>
            ) : filteredParts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "60px" }}>
                  No parts found.
                </td>
              </tr>
            ) : (
              filteredParts.map((p) => (
                <tr key={p.id}>
                  <td data-label="Part name">
                    <div className="part-info">
                      <div className="part-icon-box">
                        <Image
                          src={partImageUrl(p.partNumber, imageVersion)}
                          alt={p.name}
                          width={40}
                          height={40}
                          loading="lazy"
                          unoptimized
                          style={{ objectFit: "cover", width: "100%", height: "100%" }}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                      <div style={{ marginLeft: "4px" }}>
                        <div className="part-name" style={{ fontSize: "15px" }}>
                          {p.name}
                        </div>
                        <div className="part-category">{p.isLowStock ? "Low stock" : "In stock"}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="SKU" style={{ color: "#5f4d38", fontSize: "13px", fontWeight: "700" }}>{p.partNumber}</td>
                  <td data-label="Category">
                    <span className="role-badge">{p.category}</span>
                  </td>
                  <td data-label="Vendor">
                    <span className="role-badge">{resolveVendorLabel(p)}</span>
                  </td>
                  <td data-label="Quantity">
                    {p.quantityInStock <= 5 ? (
                      <div style={{ color: "#c63121", fontWeight: "700" }}>
                        <div>{p.quantityInStock} units</div>
                        <div style={{ fontSize: "10px", textTransform: "uppercase" }}>Low stock</div>
                      </div>
                    ) : (
                      <div style={{ color: "#2f2418" }}>{p.quantityInStock} units</div>
                    )}
                  </td>
                  <td data-label="Price" style={{ fontWeight: "600", color: "#1f140b" }}>{formatNpr(p.unitPrice)}</td>
                  <td data-label="Actions">
                    <button type="button" className="action-btn" style={{ color: "#3d2817" }} onClick={() => openEdit(p)}>
                      Edit
                    </button>
                    <button type="button" className="action-btn" style={{ color: "#8f3d2b" }} onClick={() => void handleDelete(p)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-label">Total stock value</div>
          <div className="summary-card-value">{formatNpr(totalValue)}</div>
        </div>
        <div className="summary-card alert">
          <div className="summary-card-label">Low stock alerts</div>
          <div className="summary-card-value">{lowStockCount} items</div>
        </div>
      </div>
    </main>
  );
}
