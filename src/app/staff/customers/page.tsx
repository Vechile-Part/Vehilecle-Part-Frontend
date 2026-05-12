"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiClock, FiDownload, FiFilter, FiMail, FiMapPin, FiPhone, FiSearch, FiTruck } from "react-icons/fi";
import { API_BASE_URL } from "../../../lib/api";

const API = API_BASE_URL;
const PAGE_SIZE = 4;

type SearchCustomer = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  vehicleNumber: string;
  make: string;
  model: string;
  year: number;
  address: string;
};

type CustomerProfile = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
};

type VehicleItem = {
  id: string;
  vehicleNumber: string;
  make: string;
  model: string;
  year: number;
};

type PurchaseInvoice = {
  id: string;
  issuedAtUtc: string;
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  pendingCredit: number;
  purchasedItems: string[];
  statusLabel?: string;
  statusTone?: "delivered" | "refunded" | "pending";
  itemNote?: string;
};

type FilterMode = "all" | "delivered" | "refunded" | "pending";

type SearchResult = {
  customers: SearchCustomer[];
  error: string | null;
};

type DirectoryMode = "loading" | "live-results" | "no-results" | "live-error";

const EMPTY_CUSTOMER: SearchCustomer = {
  id: "",
  fullName: "No customer selected",
  phone: "No phone on file",
  email: "No email on file",
  vehicleNumber: "",
  make: "",
  model: "",
  year: 0,
  address: "",
};

const EMPTY_PROFILE: CustomerProfile = {
  id: "",
  fullName: "No customer selected",
  phone: "No phone on file",
  email: "No email on file",
  address: "",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDateParts = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { monthDay: "Unknown", year: "date" };
  }

  return {
    monthDay: date.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
    year: date.toLocaleDateString("en-US", { year: "numeric" }),
  };
};

const initialsFromName = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");



const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseJsonText = (text: string) => {
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
};

const parseJsonSafe = async (res: Response) => {
  return parseJsonText(await res.text());
};

const readString = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
};

const readNumber = (value: unknown, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const extractRecords = (data: unknown, keys: string[] = ["items", "customers", "results", "data", "value"]) => {
  if (Array.isArray(data)) return data.filter(isRecord);
  if (!isRecord(data)) return [];

  for (const key of keys) {
    const candidate = data[key];
    if (Array.isArray(candidate)) return candidate.filter(isRecord);
  }

  return [data];
};

const normalizeSearchCustomers = (data: unknown): SearchCustomer[] =>
  extractRecords(data).map((record, index) => ({
    id: readString(record.id ?? record.customerId ?? record.userId, `customer-${index}`),
    fullName: readString(record.fullName ?? record.name ?? record.customerName, "Customer record"),
    phone: readString(record.phone ?? record.phoneNumber ?? record.mobile, "No phone on file"),
    email: readString(record.email ?? record.emailAddress, "No email on file"),
    vehicleNumber: readString(record.vehicleNumber ?? record.registrationNumber ?? record.licensePlate),
    make: readString(record.make ?? record.vehicleMake ?? record.brand),
    model: readString(record.model ?? record.vehicleModel ?? record.variant),
    year: readNumber(record.year ?? record.vehicleYear),
    address: readString(record.address ?? record.shippingAddress ?? record.defaultAddress),
  }));

const normalizeProfile = (data: unknown, fallback: SearchCustomer | undefined): CustomerProfile => {
  const record = isRecord(data) ? data : {};

  return {
    id: readString(record.id ?? record.customerId, fallback?.id ?? ""),
    fullName: readString(record.fullName ?? record.name, fallback?.fullName ?? "Customer record"),
    phone: readString(record.phone ?? record.phoneNumber, fallback?.phone ?? "No phone on file"),
    email: readString(record.email ?? record.emailAddress, fallback?.email ?? "No email on file"),
    address: readString(
      record.address ?? record.shippingAddress ?? record.defaultAddress,
      fallback?.address ?? "",
    ),
  };
};

const normalizeVehicles = (data: unknown): VehicleItem[] =>
  extractRecords(data).map((record, index) => ({
    id: readString(record.id ?? record.vehicleId, `vehicle-${index}`),
    vehicleNumber: readString(record.vehicleNumber ?? record.registrationNumber ?? record.licensePlate),
    make: readString(record.make ?? record.vehicleMake ?? record.brand),
    model: readString(record.model ?? record.vehicleModel ?? record.variant),
    year: readNumber(record.year ?? record.vehicleYear),
  }));

const normalizeHistory = (data: unknown): PurchaseInvoice[] =>
  extractRecords(data).map((record, index) => {
    const rawItems = Array.isArray(record.purchasedItems)
      ? record.purchasedItems
      : Array.isArray(record.items)
        ? record.items
        : Array.isArray(record.parts)
          ? record.parts
          : [];

    const purchasedItems = rawItems
      .map((item) => {
        if (typeof item === "string") return item;
        if (!isRecord(item)) return "";
        return readString(item.name ?? item.partName ?? item.description);
      })
      .filter(Boolean);

    const pendingCredit = readNumber(record.pendingCredit ?? record.balanceDue ?? record.openCredit);
    const totalAmount = readNumber(record.totalAmount ?? record.total ?? record.amount);

    return {
      id: readString(record.id ?? record.invoiceId ?? record.orderId, `invoice-${index}`),
      issuedAtUtc: readString(record.issuedAtUtc ?? record.date ?? record.createdAt),
      totalAmount,
      discountAmount: readNumber(record.discountAmount ?? record.discount),
      paidAmount: readNumber(record.paidAmount ?? record.paid),
      pendingCredit,
      purchasedItems,
      statusLabel: totalAmount < 0 ? "Refunded" : pendingCredit > 0 ? "Pending" : "Delivered",
      statusTone: totalAmount < 0 ? "refunded" : pendingCredit > 0 ? "pending" : "delivered",
      itemNote: pendingCredit > 0 ? "Open balance on record" : "Purchase invoice",
    };
  });

const dedupeCustomers = (customers: SearchCustomer[]) => {
  const seen = new Set<string>();
  return customers.filter((customer) => {
    if (seen.has(customer.id)) return false;
    seen.add(customer.id);
    return true;
  });
};

const sanitizeApiMessage = (message: string) =>
  message.replace(/\s*POSITION:[\s\S]*$/, "").replace(/\s+/g, " ").trim();

const readApiErrorMessage = (data: unknown, status: number, fallback: string) => {
  if (isRecord(data)) {
    const candidate = readString(data.detail ?? data.message ?? data.title);
    if (candidate) return sanitizeApiMessage(candidate) || `${fallback} (HTTP ${status})`;
  }

  return `${fallback} (HTTP ${status})`;
};

const searchByField = async (field: "fullName" | "phone" | "vehicleNumber", query: string): Promise<SearchResult> => {
  const params = new URLSearchParams({
    fullName: "",
    phone: "",
    vehicleNumber: "",
  });
  params.set(field, query);

  const response = await fetch(`${API}/api/staff/customers/search?${params.toString()}`);
  const data = await parseJsonSafe(response);

  if (!response.ok) {
    return {
      customers: [],
      error: readApiErrorMessage(data, response.status, "Live customer search is unavailable right now."),
    };
  }

  return {
    customers: normalizeSearchCustomers(data),
    error: null,
  };
};

const getHistoryTone = (invoice: PurchaseInvoice) => invoice.statusTone ?? "delivered";

const getHistoryStatusClass = (invoice: PurchaseInvoice) => {
  const tone = getHistoryTone(invoice);
  if (tone === "refunded") return "refund";
  if (tone === "pending") return "credit";
  return "settled";
};

function StaffCustomersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryFromUrl = (searchParams.get("q") ?? "").trim();

  const [directory, setDirectory] = useState<SearchCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [profile, setProfile] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [history, setHistory] = useState<PurchaseInvoice[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [directoryMode, setDirectoryMode] = useState<DirectoryMode>("loading");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const selectedSummary = useMemo(
    () => directory.find((customer) => customer.id === selectedCustomerId) ?? EMPTY_CUSTOMER,
    [directory, selectedCustomerId],
  );

  useEffect(() => {
    const performSearch = async () => {
      setIsSearching(true);
      setSearchError(null);
      setDetailError(null);

      try {
        const matches: SearchCustomer[] = [];
        const errors: string[] = [];

        const nameSearch = await searchByField("fullName", queryFromUrl);
        matches.push(...nameSearch.customers);
        if (nameSearch.error) errors.push(nameSearch.error);

        if (/\d/.test(queryFromUrl)) {
          const phoneSearch = await searchByField("phone", queryFromUrl);
          matches.push(...phoneSearch.customers);
          if (phoneSearch.error) errors.push(phoneSearch.error);

          const vehicleSearch = await searchByField("vehicleNumber", queryFromUrl);
          matches.push(...vehicleSearch.customers);
          if (vehicleSearch.error) errors.push(vehicleSearch.error);
        }

        const uniqueMatches = dedupeCustomers(matches);
        const firstError = errors[0] ?? null;

        if (uniqueMatches.length === 0) {
          setDirectory([]);
          setSelectedCustomerId("");
          setProfile(EMPTY_PROFILE);
          setVehicles([]);
          setHistory([]);
          setFilterMode("all");
          setHistoryPage(1);
          setDirectoryMode(firstError ? "live-error" : "no-results");
          setSearchError(firstError);
          return;
        }

        setDirectory(uniqueMatches);
        setSelectedCustomerId(uniqueMatches[0].id);
        setFilterMode("all");
        setHistoryPage(1);
        setDirectoryMode("live-results");
        setSearchError(null);
      } catch {
        setDirectory([]);
        setSelectedCustomerId("");
        setProfile(EMPTY_PROFILE);
        setVehicles([]);
        setHistory([]);
        setFilterMode("all");
        setHistoryPage(1);
        setDirectoryMode("live-error");
        setSearchError("The customer search request could not reach the backend.");
      } finally {
        setIsSearching(false);
      }
    };

    void performSearch();
  }, [queryFromUrl]);

  useEffect(() => {
    const loadCustomerDetails = async () => {
      if (!selectedCustomerId) {
        setProfile(EMPTY_PROFILE);
        setVehicles([]);
        setHistory([]);
        setDetailError(null);
        setIsLoadingDetails(false);
        return;
      }

      setIsLoadingDetails(true);
      setDetailError(null);

      try {
        const detailsResponse = await fetch(`${API}/api/staff/customers/${selectedCustomerId}`);
        const detailsData = await parseJsonSafe(detailsResponse);

        if (!detailsResponse.ok) {
          setProfile(normalizeProfile(null, selectedSummary));
          setVehicles([]);
          setHistory([]);
          setDetailError(readApiErrorMessage(detailsData, detailsResponse.status, "Unable to load the selected customer record."));
          return;
        }

        const detailsRecord = isRecord(detailsData) ? detailsData : {};
        setProfile(normalizeProfile(detailsRecord, selectedSummary));
        setVehicles(normalizeVehicles(detailsRecord.vehicles));
        setHistory(normalizeHistory(detailsRecord.invoices ?? detailsRecord.history ?? detailsRecord.purchases));
      } catch {
        setProfile(normalizeProfile(null, selectedSummary));
        setVehicles([]);
        setHistory([]);
        setDetailError("Unable to load the selected customer record.");
      } finally {
        setIsLoadingDetails(false);
      }
    };

    void loadCustomerDetails();
  }, [selectedCustomerId, selectedSummary]);

  const filteredHistory = useMemo(() => {
    if (filterMode === "all") return history;
    return history.filter((invoice) => getHistoryTone(invoice) === filterMode);
  }, [filterMode, history]);

  // Only use live data for insights and stats
  const lifetimeValue = history
    .filter((invoice) => invoice.totalAmount > 0)
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalOrders = history.length;
  const rewardPoints = Math.round(lifetimeValue / 5);
  const referralCredit = Math.max(
    0,
    history.reduce((sum, invoice) => sum + invoice.discountAmount, 0),
  );
  const membershipTier = lifetimeValue >= 10000 ? "Platinum Member" : "Priority Buyer";
  const emailStatus = "Customer communication record";
  const phoneStatus = "Primary Contact";
  const primaryVehicle = vehicles[0];
  const vehicleMix =
    Array.from(new Set(vehicles.map((vehicle) => vehicle.make).filter(Boolean)))
      .slice(0, 3)
      .join(", ") || "No vehicles listed";
  const customerRecordId = profile.id || "No customer selected";
  const pageStatus = isSearching
    ? {
        tone: "info",
        text: `Searching live customer records for "${queryFromUrl}"...`,
      }
    : directoryMode === "live-results"
      ? {
          tone: detailError ? "error" : "success",
          text: detailError
            ? `Found ${directory.length} customer record${directory.length === 1 ? "" : "s"}${queryFromUrl ? ` for "${queryFromUrl}"` : ""}, but the full customer details could not be loaded: ${detailError}`
            : `Loaded ${directory.length} customer record${directory.length === 1 ? "" : "s"}${queryFromUrl ? ` for "${queryFromUrl}"` : ""}.`,
        }
      : directoryMode === "live-error"
      ? {
          tone: "error",
          text: searchError ?? "Live customer search is unavailable right now.",
        }
      : {
          tone: "info",
          text: queryFromUrl
            ? `No live customer record matched "${queryFromUrl}".`
            : "Loaded the live customer directory.",
        };

  const pageCount = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);
  const visiblePages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const modeLabel = isSearching ? "Searching..." : isLoadingDetails ? "Loading details..." : "Live data";

  const exportHistory = () => {
    if (filteredHistory.length === 0) return;

    const rows = filteredHistory.map((invoice) => ({
      orderId: invoice.id,
      date: `${formatDateParts(invoice.issuedAtUtc).monthDay} ${formatDateParts(invoice.issuedAtUtc).year}`,
      status: invoice.statusLabel ?? "Delivered",
      totalAmount: invoice.totalAmount,
      purchasedItems: invoice.purchasedItems.join(" | "),
    }));

    const csv = [
      ["Order ID", "Date", "Status", "Total Amount", "Purchased Items"].join(","),
      ...rows.map((row) =>
        [row.orderId, row.date, row.status, row.totalAmount, `"${row.purchasedItems.replace(/"/g, '""')}"`].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${profile.fullName.toLowerCase().replace(/\s+/g, "-")}-purchase-history.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const addressText =
    profile.address || selectedSummary.address || "No address available in this customer record yet.";

  return (
    <section className="customer-directory-page">
      <header className="customer-directory-header">
        <div>
          <p className="customer-directory-kicker">Staff Customer Directory</p>
          <h1 className="customer-directory-title">View customer details, purchase history, and vehicle information.</h1>
          <p className="customer-directory-description">
            Search by customer name, phone number, or vehicle number to open a customer record and review the latest
            customer activity.
          </p>
        </div>

        <form
          className="customer-directory-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            const query = searchInputRef.current?.value.trim() ?? "";
            router.push(query ? `/customers?q=${encodeURIComponent(query)}` : "/customers");
          }}
        >
          <div className="customer-directory-search-input-wrap">
            <FiSearch size={18} />
            <input
              key={queryFromUrl}
              ref={searchInputRef}
              defaultValue={queryFromUrl}
              type="text"
              className="customer-directory-search-input"
              placeholder="Find customer by name, phone, or vehicle number..."
            />
          </div>
          <button className="customer-directory-search-button" type="submit" disabled={isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </button>
        </form>
      </header>

      <div className="customer-directory-utility-row">
        <div className={`customer-directory-status ${pageStatus.tone}`}>{pageStatus.text}</div>
        <div className="customer-directory-mode-pill">{modeLabel}</div>
      </div>

      <section className="customer-directory-matches">
        <div className="customer-directory-section-head">
          <h2>Directory Matches</h2>
          <span>
            {directory.length} customer record{directory.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="customer-directory-match-list">
          {directory.length === 0 ? (
            <div className="customer-directory-empty-state">No customer records found for this search.</div>
          ) : (
            directory.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className={`customer-directory-match-card ${customer.id === selectedCustomerId ? "active" : ""}`}
                onClick={() => {
                  setSelectedCustomerId(customer.id);
                  setFilterMode("all");
                  setHistoryPage(1);
                }}
              >
                <div className="customer-directory-match-avatar">{initialsFromName(customer.fullName)}</div>
                <div className="customer-directory-match-meta">
                  <strong>{customer.fullName}</strong>
                  <span>{customer.phone}</span>
                  <span>
                    {customer.vehicleNumber || "Vehicle not listed"}
                    {customer.make || customer.model ? ` | ${[customer.make, customer.model].filter(Boolean).join(" ")}` : ""}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <div className="customer-directory-top-grid">
        <article
          className="customer-directory-profile-card"
          title={
            primaryVehicle
              ? `Primary vehicle: ${primaryVehicle.make} ${primaryVehicle.model} (${primaryVehicle.vehicleNumber})`
              : undefined
          }
        >
          <div className="customer-directory-profile-avatar">{initialsFromName(profile.fullName)}</div>
          <h2 className="customer-directory-profile-name">{profile.fullName}</h2>
          <p className="customer-directory-profile-id">Customer ID: {customerRecordId}</p>
          <span className="customer-directory-profile-badge">{membershipTier}</span>

          <div className="customer-directory-profile-stats">
            <div>
              <span>Lifetime Value</span>
              <strong>{formatCurrency(lifetimeValue)}</strong>
            </div>
            <div>
              <span>Total Orders</span>
              <strong>{totalOrders}</strong>
            </div>
            <div>
              <span>Vehicles</span>
              <strong>{vehicles.length}</strong>
            </div>
          </div>
        </article>

        <div className="customer-directory-overview-grid">
          <article className="customer-directory-info-card accent">
            <div className="customer-directory-info-icon">
              <FiPhone size={22} />
            </div>
            <div>
              <p className="customer-directory-info-label">Phone Number</p>
              <strong>{profile.phone}</strong>
              <span>{phoneStatus}</span>
            </div>
          </article>

          <article className="customer-directory-info-card">
            <div className="customer-directory-info-icon">
              <FiMail size={22} />
            </div>
            <div>
              <p className="customer-directory-info-label">Email Address</p>
              <strong>{profile.email}</strong>
              <span>{emailStatus}</span>
            </div>
          </article>

          <article className="customer-directory-wide-card">
            <div className="customer-directory-info-icon soft">
              <FiMapPin size={22} />
            </div>
            <div className="customer-directory-wide-card-copy">
              <p className="customer-directory-info-label">Default Address</p>
              <strong>{addressText}</strong>
              <span>Staff can verify delivery, billing, and registration details from this record.</span>
            </div>
          </article>

          <article className="customer-directory-summary-card">
            <div className="customer-directory-summary-metrics">
              <div>
                <span>Reward Points</span>
                <strong>{rewardPoints.toLocaleString()} pts</strong>
              </div>
              <div>
                <span>Referral Credit</span>
                <strong>{formatCurrency(referralCredit)}</strong>
              </div>
              <div>
                <span>Primary Vehicle</span>
                <strong>{primaryVehicle ? `${primaryVehicle.make} ${primaryVehicle.model}` : "Not available"}</strong>
              </div>
            </div>
            <button className="customer-directory-summary-button" type="button" onClick={exportHistory} disabled={filteredHistory.length === 0}>
              <FiDownload size={18} />
              Export Purchase History
            </button>
          </article>
        </div>
      </div>

      <div className="customer-directory-bottom-grid">
        <section className="customer-directory-history-card">
          <div className="customer-directory-history-head">
            <div className="customer-directory-history-title">
              <FiClock size={21} />
              <h2>Purchase History</h2>
            </div>

            <div className="customer-directory-history-actions">
              <label className="customer-directory-filter">
                <FiFilter size={16} />
                <select
                  value={filterMode}
                  onChange={(event) => {
                    setFilterMode(event.target.value as FilterMode);
                    setHistoryPage(1);
                  }}
                >
                  <option value="all">All records</option>
                  <option value="delivered">Delivered</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                </select>
              </label>

              <button className="customer-directory-export-button" type="button" onClick={exportHistory} disabled={filteredHistory.length === 0}>
                <FiDownload size={16} />
                Export
              </button>
            </div>
          </div>

          <div className="customer-directory-history-table">
            <div className="customer-directory-history-header">
              <span>Order Date</span>
              <span>Order ID</span>
              <span>Purchased Items</span>
              <span>Status</span>
              <span>Total Amount</span>
            </div>

            {paginatedHistory.length === 0 ? (
              <div className="customer-directory-empty-state">No purchase history matches this filter yet.</div>
            ) : (
              paginatedHistory.map((invoice) => {
                const dateParts = formatDateParts(invoice.issuedAtUtc);
                const summary = invoice.purchasedItems[0] ?? "Purchase invoice";
                const subtitle =
                  invoice.itemNote ||
                  (invoice.purchasedItems.length > 1 ? `+ ${invoice.purchasedItems.length - 1} others` : "Purchase invoice");

                return (
                  <article className="customer-directory-history-row" key={invoice.id}>
                    <div className="customer-directory-history-cell">
                      <span className="customer-directory-mobile-label">Order Date</span>
                      <strong>{dateParts.monthDay},</strong>
                      <span>{dateParts.year}</span>
                    </div>

                    <div className="customer-directory-history-cell">
                      <span className="customer-directory-mobile-label">Order ID</span>
                      <strong>#{invoice.id}</strong>
                    </div>

                    <div className="customer-directory-history-cell customer-directory-history-item-cell">
                      <span className="customer-directory-mobile-label">Purchased Items</span>
                      <div className="customer-directory-history-item">
                        <div className="customer-directory-history-thumb">{initialsFromName(summary)}</div>
                        <div>
                          <strong>{summary}</strong>
                          <span>{subtitle}</span>
                        </div>
                      </div>
                    </div>

                    <div className="customer-directory-history-cell">
                      <span className="customer-directory-mobile-label">Status</span>
                      <span className={`customer-directory-status-pill ${getHistoryStatusClass(invoice)}`}>
                        {invoice.statusLabel ?? "Delivered"}
                      </span>
                    </div>

                    <div className="customer-directory-history-cell customer-directory-history-amount">
                      <span className="customer-directory-mobile-label">Total Amount</span>
                      <strong className={invoice.totalAmount < 0 ? "negative" : ""}>{formatCurrency(invoice.totalAmount)}</strong>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="customer-directory-history-footer">
            <p>Showing {paginatedHistory.length} of {filteredHistory.length} transactions</p>

            <div className="customer-directory-pagination">
              <button
                type="button"
                onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                disabled={historyPage === 1}
              >
                {"<"}
              </button>
              {visiblePages.map((page) => (
                <button
                  key={page}
                  type="button"
                  className={historyPage === page ? "active" : ""}
                  onClick={() => setHistoryPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setHistoryPage((page) => Math.min(pageCount, page + 1))}
                disabled={historyPage === pageCount}
              >
                {">"}
              </button>
            </div>
          </div>
        </section>

        <aside className="customer-directory-vehicle-card">
          <div className="customer-directory-section-head">
            <h2>Vehicle Records</h2>
            <span>{vehicles.length} on file</span>
          </div>

          {vehicles.length === 0 ? (
            <div className="customer-directory-empty-state compact">No vehicles have been linked to this customer yet.</div>
          ) : (
            <div className="customer-directory-vehicle-list">
              {vehicles.map((vehicle) => (
                <article className="customer-directory-vehicle-item" key={vehicle.id}>
                  <div className="customer-directory-vehicle-icon">
                    <FiTruck size={18} />
                  </div>
                  <div className="customer-directory-vehicle-copy">
                    <strong>{[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle record"}</strong>
                    <span>
                      {vehicle.vehicleNumber || "Registration pending"}
                      {vehicle.year ? ` | ${vehicle.year}` : ""}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="customer-directory-vehicle-note">
            <FiTruck size={18} />
            <p>Vehicle records help staff confirm registrations before preparing parts, invoices, or service work.</p>
          </div>

          <div className="customer-directory-vehicle-summary">
            <div>
              <span>Lead Vehicle</span>
              <strong>{primaryVehicle?.vehicleNumber || "Not available"}</strong>
            </div>
            <div>
              <span>Fleet Mix</span>
              <strong>{vehicleMix}</strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function StaffCustomersPage() {
  return (
    <Suspense
      fallback={
        <section className="customer-directory-page">
          <div className="customer-directory-utility-row">
            <div className="customer-directory-status info">Loading customer directory...</div>
          </div>
        </section>
      }
    >
      <StaffCustomersPageContent />
    </Suspense>
  );
}
