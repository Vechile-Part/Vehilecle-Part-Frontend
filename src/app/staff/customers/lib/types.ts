export type SearchCustomer = {
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

export type CustomerProfile = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
};

export type VehicleItem = {
  id: string;
  vehicleNumber: string;
  make: string;
  model: string;
  year: number;
};

export type PurchaseInvoice = {
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

export type FilterMode = "all" | "delivered" | "refunded" | "pending";

export type SearchResult = {
  customers: SearchCustomer[];
  error: string | null;
};
