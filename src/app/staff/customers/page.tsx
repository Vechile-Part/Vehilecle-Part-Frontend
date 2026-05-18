"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiClock, FiDownload, FiFilter, FiMail, FiPhone, FiSearch, FiTruck, FiX } from "react-icons/fi";
import { formatNpr } from "@/lib/currency";
import { apiFetch, isUuid } from "@/lib/http";

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
  extractRecords(data).map((record, index) => {
    const nestedVehicles = extractRecords(record.vehicles ?? record.Vehicles);
    const firstVehicle = nestedVehicles[0];

    return {
      id: readString(record.id ?? record.customerId ?? record.userId, `customer-${index}`),
      fullName: readString(record.fullName ?? record.name ?? record.customerName, "Customer record"),
      phone: readString(record.phone ?? record.phoneNumber ?? record.mobile, "No phone on file"),
      email: readString(record.email ?? record.emailAddress, "No email on file"),
      vehicleNumber: readString(
        record.vehicleNumber ??
          record.VehicleNumber ??
          firstVehicle?.vehicleNumber ??
          firstVehicle?.VehicleNumber ??
          record.registrationNumber ??
          record.licensePlate,
      ),
      make: readString(
        record.make ?? record.Make ?? firstVehicle?.make ?? firstVehicle?.Make ?? record.vehicleMake ?? record.brand,
      ),
      model: readString(
        record.model ?? record.Model ?? firstVehicle?.model ?? firstVehicle?.Model ?? record.vehicleModel ?? record.variant,
      ),
      year: readNumber(record.year ?? record.Year ?? firstVehicle?.year ?? firstVehicle?.Year ?? record.vehicleYear),
      address: readString(record.address ?? record.shippingAddress ?? record.defaultAddress),
    };
  });

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

/** UI shows plates as "BA 66 pa 6815 | 2025" — search only the plate portion. */
const normalizeVehicleSearchTerm = (query: string) => {
  const trimmed = query.trim();
  const pipeYear = trimmed.match(/^(.+?)\s*\|\s*\d{4}\s*$/);
  if (pipeYear) return pipeYear[1].trim();
  return trimmed;
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

const searchCustomersApi = async (params: URLSearchParams): Promise<SearchResult> => {
  const response = await apiFetch(`/api/staff/customers/search?${params.toString()}`);
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

const searchByField = async (field: "fullName" | "phone" | "vehicleNumber", query: string): Promise<SearchResult> => {
  const params = new URLSearchParams({
    fullName: "",
    phone: "",
    vehicleNumber: "",
  });
  params.set(field, query);
  return searchCustomersApi(params);
};

const searchByCustomerId = async (customerId: string): Promise<SearchResult> => {
  const params = new URLSearchParams({
    fullName: "",
    phone: "",
    vehicleNumber: "",
    customerId,
  });
  return searchCustomersApi(params);
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchGenerationRef = useRef(0);
  const detailsRequestIdRef = useRef(0);
  const directoryBasePath = pathname?.startsWith("/staff") ? "/staff/customers" : "/customers";
  const rawCustomerIdParam = (searchParams.get("customerId") ?? "").trim();
  const rawQueryParam = (searchParams.get("q") ?? "").trim();
  const hasInvalidCustomerIdParam = rawCustomerIdParam.length > 0 && !isUuid(rawCustomerIdParam);
  const customerIdFromUrl = isUuid(rawCustomerIdParam)
    ? rawCustomerIdParam
    : isUuid(rawQueryParam)
      ? rawQueryParam
      : "";
  const textQueryFromUrl = isUuid(rawQueryParam) ? "" : rawQueryParam;
  const searchInputDefault = customerIdFromUrl || textQueryFromUrl;
  const searchLabel = searchInputDefault;

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
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const selectedSummary = useMemo(
    () => directory.find((customer) => customer.id === selectedCustomerId) ?? EMPTY_CUSTOMER,
    [directory, selectedCustomerId],
  );

  useEffect(() => {
    const performSearch = async () => {
      const searchGeneration = ++searchGenerationRef.current;

      setIsSearching(true);
      setSearchError(null);
      setDetailError(null);
      setDirectory([]);
      setSelectedCustomerId("");
      setProfile(EMPTY_PROFILE);
      setVehicles([]);
      setHistory([]);

      try {
        if (hasInvalidCustomerIdParam) {
          setDirectory([]);
          setSelectedCustomerId("");
          setProfile(EMPTY_PROFILE);
          setVehicles([]);
          setHistory([]);
          setFilterMode("all");
          setHistoryPage(1);
          setDirectoryMode("live-error");
          setSearchError(
            "Customer ID must be a valid GUID (for example: 3fa85f64-5717-4562-b3fc-2c963f66afa6).",
          );
          return;
        }

        if (!customerIdFromUrl && !textQueryFromUrl) {
          setDirectory([]);
          setSelectedCustomerId("");
          setProfile(EMPTY_PROFILE);
          setVehicles([]);
          setHistory([]);
          setFilterMode("all");
          setHistoryPage(1);
          setDirectoryMode("no-results");
          setSearchError(null);
          return;
        }

        const matches: SearchCustomer[] = [];
        const errors: string[] = [];

        if (customerIdFromUrl) {
          const idSearch = await searchByCustomerId(customerIdFromUrl);
          if (searchGeneration !== searchGenerationRef.current) return;
          matches.push(...idSearch.customers);
          if (idSearch.error) errors.push(idSearch.error);
        } else {
          const vehicleTerm = normalizeVehicleSearchTerm(textQueryFromUrl);

          const nameSearch = await searchByField("fullName", textQueryFromUrl);
          if (searchGeneration !== searchGenerationRef.current) return;
          matches.push(...nameSearch.customers);
          if (nameSearch.error) errors.push(nameSearch.error);

          if (/\d/.test(textQueryFromUrl)) {
            const phoneSearch = await searchByField("phone", textQueryFromUrl);
            if (searchGeneration !== searchGenerationRef.current) return;
            matches.push(...phoneSearch.customers);
            if (phoneSearch.error) errors.push(phoneSearch.error);
          }

          if (vehicleTerm.length >= 2) {
            const vehicleSearch = await searchByField("vehicleNumber", vehicleTerm);
            if (searchGeneration !== searchGenerationRef.current) return;
            matches.push(...vehicleSearch.customers);
            if (vehicleSearch.error) errors.push(vehicleSearch.error);
          }
        }

        const uniqueMatches = dedupeCustomers(matches);
        const firstError = errors[0] ?? null;
        const openDetailsForMatch = Boolean(customerIdFromUrl) && uniqueMatches.length === 1;

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
          setDetailModalOpen(false);
          return;
        }

        setDirectory(uniqueMatches);
        if (openDetailsForMatch) {
          setSelectedCustomerId(uniqueMatches[0].id);
          setDetailModalOpen(true);
        } else {
          setSelectedCustomerId("");
          setDetailModalOpen(false);
        }
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
  }, [customerIdFromUrl, textQueryFromUrl, hasInvalidCustomerIdParam]);

  useEffect(() => {
    const customerId = selectedCustomerId;

    if (!customerId || !detailModalOpen) {
      if (!customerId) {
        setProfile(EMPTY_PROFILE);
        setVehicles([]);
        setHistory([]);
        setDetailError(null);
        setIsLoadingDetails(false);
      }
      return;
    }

    const requestId = ++detailsRequestIdRef.current;
    const summary = directory.find((customer) => customer.id === customerId) ?? EMPTY_CUSTOMER;

    const loadCustomerDetails = async () => {
      setIsLoadingDetails(true);
      setDetailError(null);

      try {
        const detailsResponse = await apiFetch(`/api/staff/customers/${customerId}`);
        const detailsData = await parseJsonSafe(detailsResponse);

        if (requestId !== detailsRequestIdRef.current) return;

        if (!detailsResponse.ok) {
          setProfile(normalizeProfile(null, summary));
          setVehicles([]);
          setHistory([]);
          setDetailError(
            readApiErrorMessage(detailsData, detailsResponse.status, "Unable to load the selected customer record."),
          );
          return;
        }

        const detailsRecord = isRecord(detailsData) ? detailsData : {};
        setProfile(normalizeProfile(detailsRecord, summary));
        const loadedVehicles = normalizeVehicles(detailsRecord.vehicles ?? detailsRecord.Vehicles);
        setVehicles(loadedVehicles);
        setHistory(normalizeHistory(detailsRecord.invoices ?? detailsRecord.history ?? detailsRecord.purchases));

        const primary = loadedVehicles[0];
        if (primary?.vehicleNumber) {
          setDirectory((prev) => {
            const index = prev.findIndex((customer) => customer.id === customerId);
            if (index < 0) return prev;

            const existing = prev[index];
            if (
              existing.vehicleNumber === primary.vehicleNumber &&
              existing.make === primary.make &&
              existing.model === primary.model &&
              existing.year === primary.year
            ) {
              return prev;
            }

            const next = [...prev];
            next[index] = {
              ...existing,
              vehicleNumber: primary.vehicleNumber,
              make: primary.make,
              model: primary.model,
              year: primary.year,
            };
            return next;
          });
        }
      } catch {
        if (requestId !== detailsRequestIdRef.current) return;
        setProfile(normalizeProfile(null, summary));
        setVehicles([]);
        setHistory([]);
        setDetailError("Unable to load the selected customer record.");
      } finally {
        if (requestId === detailsRequestIdRef.current) {
          setIsLoadingDetails(false);
        }
      }
    };

    void loadCustomerDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- directory read for fallback only; do not refetch when directory updates
  }, [selectedCustomerId, detailModalOpen]);

  const openCustomerModal = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setFilterMode("all");
    setHistoryPage(1);
    setDetailModalOpen(true);
  };

  const closeCustomerModal = () => {
    detailsRequestIdRef.current += 1;
    setDetailModalOpen(false);
    setSelectedCustomerId("");
    setDetailError(null);
    setIsLoadingDetails(false);
  };

  useEffect(() => {
    if (!detailModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCustomerModal();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [detailModalOpen]);

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
  const membershipTier = lifetimeValue >= 10000 ? "Platinum Customer" : "Priority Buyer";
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
        text: customerIdFromUrl
          ? `Looking up customer ID ${customerIdFromUrl}...`
          : `Searching live customer records for "${searchLabel}"...`,
      }
    : directoryMode === "live-results"
      ? {
          tone: detailError ? "error" : "success",
          text: detailError
            ? `Found ${directory.length} customer record${directory.length === 1 ? "" : "s"}${searchLabel ? ` for "${searchLabel}"` : ""}, but the full customer details could not be loaded: ${detailError}`
            : `Loaded ${directory.length} customer record${directory.length === 1 ? "" : "s"}${searchLabel ? ` for "${searchLabel}"` : ""}.`,
        }
      : directoryMode === "live-error"
      ? {
          tone: "error",
          text: searchError ?? "Live customer search is unavailable right now.",
        }
      : {
          tone: "info",
          text: searchLabel
            ? `No live customer record matched "${searchLabel}".`
            : "Search by customer name, phone, vehicle number, or customer ID (GUID).",
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

  return (
    <section className="customer-directory-page">
      <header className="customer-directory-header">
        <div>
          <p className="customer-directory-kicker">Staff Customer Directory</p>
          <h1 className="customer-directory-title">View customer details, purchase history, and vehicle information.</h1>
          <p className="customer-directory-description">
            Search by customer name, phone number, vehicle number, or customer ID (GUID), then click a match to open
            their full record in a modal.
          </p>
        </div>

        <form
          className="customer-directory-search-form"
          onSubmit={(event) => {
            event.preventDefault();
            const query = searchInputRef.current?.value.trim() ?? "";
            if (!query) {
              router.push(directoryBasePath);
              return;
            }
            if (isUuid(query)) {
              router.push(`${directoryBasePath}?customerId=${encodeURIComponent(query)}`);
              return;
            }
            router.push(`${directoryBasePath}?q=${encodeURIComponent(query)}`);
          }}
        >
          <div className="customer-directory-search-input-wrap">
            <FiSearch size={18} />
            <input
              key={searchInputDefault}
              ref={searchInputRef}
              defaultValue={searchInputDefault}
              type="search"
              className="customer-directory-search-input"
              placeholder="Name, phone, vehicle number, or customer ID (GUID)..."
              spellCheck={false}
              autoComplete="off"
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
                className={`customer-directory-match-card ${customer.id === selectedCustomerId && detailModalOpen ? "active" : ""}`}
                onClick={() => openCustomerModal(customer.id)}
              >
                <div className="customer-directory-match-avatar">{initialsFromName(customer.fullName)}</div>
                <div className="customer-directory-match-meta">
                  <strong>{customer.fullName}</strong>
                  {customer.id && !customer.id.startsWith("customer-") ? (
                    <span className="customer-directory-match-id" title="Customer ID">
                      ID: {customer.id}
                    </span>
                  ) : null}
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

      {detailModalOpen && selectedCustomerId ? (
        <div
          className="modal-overlay customer-directory-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-detail-modal-title"
          onClick={closeCustomerModal}
        >
          <div
            className="modal-container customer-directory-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="customer-directory-modal-toolbar">
              <div>
                <p className="customer-directory-modal-kicker">Customer record</p>
                <h2 id="customer-detail-modal-title" className="customer-directory-modal-title">
                  {selectedSummary.fullName || profile.fullName}
                </h2>
              </div>
              <button
                type="button"
                className="customer-directory-modal-close"
                onClick={closeCustomerModal}
                aria-label="Close customer details"
              >
                <FiX size={22} />
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="customer-directory-modal-loading">Loading customer details…</div>
            ) : detailError ? (
              <div className={`customer-directory-status error customer-directory-modal-error`}>{detailError}</div>
            ) : (
              <div className="customer-directory-modal-body">
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
              <strong>{formatNpr(lifetimeValue)}</strong>
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


          <article className="customer-directory-summary-card">
            <div className="customer-directory-summary-metrics">
              <div>
                <span>Reward Points</span>
                <strong>{rewardPoints.toLocaleString()} pts</strong>
              </div>
              <div>
                <span>Referral Credit</span>
                <strong>{formatNpr(referralCredit)}</strong>
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
                      <strong className={invoice.totalAmount < 0 ? "negative" : ""}>{formatNpr(invoice.totalAmount)}</strong>
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
              </div>
            )}
          </div>
        </div>
      ) : null}
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
