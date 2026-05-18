"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { apiFetch, isUuid } from "@/lib/http";
import { AdminCustomersView } from "./components/AdminCustomersView";
import { CustomerDetailModal } from "./components/CustomerDetailModal";
import { StaffDirectoryView } from "./components/StaffDirectoryView";
import { PAGE_SIZE, EMPTY_CUSTOMER, EMPTY_PROFILE } from "./lib/constants";
import {
  dedupeCustomers,
  loadAdminCustomerDirectory,
  normalizeHistory,
  normalizeProfile,
  normalizeVehicleSearchTerm,
  normalizeVehicles,
  searchByCustomerId,
  searchByField,
  vehiclesFromSearchSummary,
} from "./lib/customerApi";
import type { CustomerProfile, FilterMode, PurchaseInvoice, SearchCustomer, VehicleItem } from "./lib/types";
import { formatDateParts, getHistoryTone, isRecord, parseJsonSafe, readApiErrorMessage } from "./lib/utils";

export function StaffCustomersPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchGenerationRef = useRef(0);
  const detailsRequestIdRef = useRef(0);
  const isAdminView = pathname?.startsWith("/admin");
  const directoryBasePath = pathname?.startsWith("/staff") ? "/staff/customers" : "/admin/customer-accounts";
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

  const [directory, setDirectory] = useState<SearchCustomer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [profile, setProfile] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [history, setHistory] = useState<PurchaseInvoice[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [adminListLoading, setAdminListLoading] = useState(false);
  const [adminTableSearch, setAdminTableSearch] = useState("");

  const selectedSummary = useMemo(
    () => directory.find((customer) => customer.id === selectedCustomerId) ?? EMPTY_CUSTOMER,
    [directory, selectedCustomerId],
  );

  const adminFilteredCustomers = useMemo(() => {
    const term = adminTableSearch.trim().toLowerCase();
    if (!term) return directory;
    return directory.filter(
      (customer) =>
        customer.fullName.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.phone.includes(term) ||
        customer.id.toLowerCase().includes(term),
    );
  }, [adminTableSearch, directory]);

  const loadAdminCustomerList = async () => {
    setAdminListLoading(true);
    setSearchError(null);
    try {
      const listResult = await loadAdminCustomerDirectory();
      setDirectory(listResult.customers);
      setSearchError(listResult.error);
    } catch {
      setDirectory([]);
      setSearchError("Could not load the customer list.");
    } finally {
      setAdminListLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminView) return;
    void loadAdminCustomerList();
  }, [isAdminView]);

  useEffect(() => {
    if (isAdminView) return;

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
          setSearchError("Customer ID must be a valid GUID (for example: 3fa85f64-5717-4562-b3fc-2c963f66afa6).");
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
        setSearchError(null);
      } catch {
        setDirectory([]);
        setSelectedCustomerId("");
        setProfile(EMPTY_PROFILE);
        setVehicles([]);
        setHistory([]);
        setFilterMode("all");
        setHistoryPage(1);
        setSearchError("The customer search request could not reach the backend.");
      } finally {
        setIsSearching(false);
      }
    };

    void performSearch();
  }, [customerIdFromUrl, textQueryFromUrl, hasInvalidCustomerIdParam, isAdminView]);

  useEffect(() => {
    const customerId = selectedCustomerId;

    if (!customerId || !detailModalOpen) {
      if (!customerId) {
        setProfile(EMPTY_PROFILE);
        setVehicles([]);
        setHistory([]);
        setDetailError(null);
        setIsLoadingHistory(false);
      }
      return;
    }

    const requestId = ++detailsRequestIdRef.current;
    const summary = directory.find((customer) => customer.id === customerId) ?? EMPTY_CUSTOMER;

    const loadCustomerDetails = async () => {
      setIsLoadingHistory(true);
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
          setIsLoadingHistory(false);
        }
      }
    };

    void loadCustomerDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- directory read for fallback only; do not refetch when directory updates
  }, [selectedCustomerId, detailModalOpen]);

  const openCustomerModal = (customerId: string) => {
    const summary = directory.find((customer) => customer.id === customerId) ?? EMPTY_CUSTOMER;
    setProfile(normalizeProfile(null, summary));
    setVehicles(vehiclesFromSearchSummary(summary));
    setHistory([]);
    setDetailError(null);
    setIsLoadingHistory(true);
    setSelectedCustomerId(customerId);
    setFilterMode("all");
    setHistoryPage(1);
    setDetailModalOpen(true);
  };

  useEffect(() => {
    if (!isAdminView || !customerIdFromUrl || adminListLoading) return;
    openCustomerModal(customerIdFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep-link once list is ready
  }, [isAdminView, customerIdFromUrl, adminListLoading]);

  const closeCustomerModal = () => {
    detailsRequestIdRef.current += 1;
    setDetailModalOpen(false);
    setSelectedCustomerId("");
    setDetailError(null);
    setIsLoadingHistory(false);
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

  const lifetimeValue = history
    .filter((invoice) => invoice.totalAmount > 0)
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalOrders = history.length;
  const openCredit = history.reduce((sum, invoice) => sum + Math.max(0, invoice.pendingCredit), 0);
  const customerRecordId = profile.id || selectedCustomerId;

  const pageCount = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * PAGE_SIZE, historyPage * PAGE_SIZE);

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

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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
  };

  return (
    <section className={isAdminView ? "admin-page customer-directory-page" : "customer-directory-page"}>
      {isAdminView ? (
        <AdminCustomersView
          adminListLoading={adminListLoading}
          directoryCount={directory.length}
          searchError={searchError}
          adminTableSearch={adminTableSearch}
          onAdminTableSearchChange={setAdminTableSearch}
          adminFilteredCustomers={adminFilteredCustomers}
          selectedCustomerId={selectedCustomerId}
          detailModalOpen={detailModalOpen}
          onRefresh={() => void loadAdminCustomerList()}
          onOpenCustomer={openCustomerModal}
        />
      ) : (
        <StaffDirectoryView
          searchInputRef={searchInputRef}
          searchInputDefault={searchInputDefault}
          isSearching={isSearching}
          directory={directory}
          selectedCustomerId={selectedCustomerId}
          detailModalOpen={detailModalOpen}
          onSearchSubmit={handleSearchSubmit}
          onOpenCustomer={openCustomerModal}
        />
      )}

      {detailModalOpen && selectedCustomerId ? (
        <CustomerDetailModal
          selectedCustomerId={selectedCustomerId}
          profile={profile}
          selectedSummary={selectedSummary}
          detailError={detailError}
          isLoadingHistory={isLoadingHistory}
          totalOrders={totalOrders}
          lifetimeValue={lifetimeValue}
          openCredit={openCredit}
          customerRecordId={customerRecordId}
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
          historyPage={historyPage}
          onHistoryPageChange={setHistoryPage}
          pageCount={pageCount}
          paginatedHistory={paginatedHistory}
          filteredHistoryLength={filteredHistory.length}
          vehicles={vehicles}
          onClose={closeCustomerModal}
          onExportHistory={exportHistory}
        />
      ) : null}
    </section>
  );
}
