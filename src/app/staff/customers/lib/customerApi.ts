import { apiFetch } from "@/lib/http";
import type { CustomerProfile, PurchaseInvoice, SearchCustomer, SearchResult, VehicleItem } from "./types";
import {
  extractRecords,
  isRecord,
  parseJsonSafe,
  readApiErrorMessage,
  readNumber,
  readString,
} from "./utils";

export const normalizeAdminCustomerList = (data: unknown): SearchCustomer[] => {
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => {
      if (!isRecord(row)) return null;
      const id = readString(row.id ?? row.Id, "");
      if (!id) return null;

      return {
        id,
        fullName: readString(row.fullName ?? row.FullName, "Customer record"),
        phone: readString(row.phone ?? row.Phone, "No phone on file"),
        email: readString(row.email ?? row.Email, "No email on file"),
        vehicleNumber: "",
        make: "",
        model: "",
        year: 0,
        address: "",
      } satisfies SearchCustomer;
    })
    .filter((row): row is SearchCustomer => row !== null);
};

export const loadAdminCustomerDirectory = async (): Promise<SearchResult> => {
  const response = await apiFetch("/api/admin/customers");
  const data = await parseJsonSafe(response);

  if (!response.ok) {
    return {
      customers: [],
      error: readApiErrorMessage(data, response.status, "Could not load the customer list."),
    };
  }

  return {
    customers: normalizeAdminCustomerList(data),
    error: null,
  };
};

export const normalizeSearchCustomers = (data: unknown): SearchCustomer[] =>
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

export const normalizeProfile = (data: unknown, fallback: SearchCustomer | undefined): CustomerProfile => {
  const record = isRecord(data) ? data : {};

  return {
    id: readString(record.id ?? record.Id ?? record.customerId ?? record.CustomerId, fallback?.id ?? ""),
    fullName: readString(record.fullName ?? record.FullName ?? record.name ?? record.Name, fallback?.fullName ?? "Customer record"),
    phone: readString(record.phone ?? record.Phone ?? record.phoneNumber, fallback?.phone ?? "No phone on file"),
    email: readString(record.email ?? record.Email ?? record.emailAddress, fallback?.email ?? "No email on file"),
    address: readString(
      record.address ?? record.Address ?? record.shippingAddress ?? record.defaultAddress,
      fallback?.address ?? "",
    ),
  };
};

export const normalizeVehicles = (data: unknown): VehicleItem[] =>
  extractRecords(data).map((record, index) => ({
    id: readString(record.id ?? record.Id ?? record.vehicleId ?? record.VehicleId, `vehicle-${index}`),
    vehicleNumber: readString(record.vehicleNumber ?? record.VehicleNumber ?? record.registrationNumber ?? record.licensePlate),
    make: readString(record.make ?? record.Make ?? record.vehicleMake ?? record.brand),
    model: readString(record.model ?? record.Model ?? record.vehicleModel ?? record.variant),
    year: readNumber(record.year ?? record.Year ?? record.vehicleYear),
  }));

export const normalizeHistory = (data: unknown): PurchaseInvoice[] =>
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
        return readString(item.name ?? item.Name ?? item.partName ?? item.PartName ?? item.description ?? item.Description);
      })
      .filter(Boolean);

    const pendingCredit = readNumber(record.pendingCredit ?? record.PendingCredit ?? record.balanceDue ?? record.openCredit);
    const totalAmount = readNumber(record.totalAmount ?? record.TotalAmount ?? record.total ?? record.amount);

    return {
      id: readString(record.id ?? record.Id ?? record.invoiceId ?? record.InvoiceId ?? record.orderId, `invoice-${index}`),
      issuedAtUtc: readString(record.issuedAtUtc ?? record.IssuedAtUtc ?? record.date ?? record.createdAt),
      totalAmount,
      discountAmount: readNumber(record.discountAmount ?? record.DiscountAmount ?? record.discount),
      paidAmount: readNumber(record.paidAmount ?? record.PaidAmount ?? record.paid),
      pendingCredit,
      purchasedItems,
      statusLabel: totalAmount < 0 ? "Refunded" : pendingCredit > 0 ? "Pending" : "Delivered",
      statusTone: totalAmount < 0 ? "refunded" : pendingCredit > 0 ? "pending" : "delivered",
      itemNote: pendingCredit > 0 ? "Open balance on record" : "Purchase invoice",
    };
  });

export const dedupeCustomers = (customers: SearchCustomer[]) => {
  const seen = new Set<string>();
  return customers.filter((customer) => {
    if (seen.has(customer.id)) return false;
    seen.add(customer.id);
    return true;
  });
};

export const normalizeVehicleSearchTerm = (query: string) => {
  const trimmed = query.trim();
  const pipeYear = trimmed.match(/^(.+?)\s*\|\s*\d{4}\s*$/);
  if (pipeYear) return pipeYear[1].trim();
  return trimmed;
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

export const searchByField = async (field: "fullName" | "phone" | "vehicleNumber", query: string): Promise<SearchResult> => {
  const params = new URLSearchParams({
    fullName: "",
    phone: "",
    vehicleNumber: "",
  });
  params.set(field, query);
  return searchCustomersApi(params);
};

export const searchByCustomerId = async (customerId: string): Promise<SearchResult> => {
  const params = new URLSearchParams({
    fullName: "",
    phone: "",
    vehicleNumber: "",
    customerId,
  });
  return searchCustomersApi(params);
};


export const loadStaffCustomerDirectory = async (): Promise<SearchResult> => {
  const response = await apiFetch("/api/staff/customers");
  const data = await parseJsonSafe(response);

  if (!response.ok) {
    return {
      customers: [],
      error: readApiErrorMessage(data, response.status, "Could not load the customer list."),
    };
  }

  return {
    customers: normalizeAdminCustomerList(data),
    error: null,
  };
};

export const vehiclesFromSearchSummary = (summary: SearchCustomer): VehicleItem[] => {
  if (!summary.vehicleNumber && !summary.make && !summary.model) return [];

  return [
    {
      id: "",
      vehicleNumber: summary.vehicleNumber,
      make: summary.make,
      model: summary.model,
      year: summary.year,
    },
  ];
};
