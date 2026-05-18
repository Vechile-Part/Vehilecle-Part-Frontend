import type { CustomerProfile, SearchCustomer } from "./types";

export const PAGE_SIZE = 4;

export const EMPTY_CUSTOMER: SearchCustomer = {
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

export const EMPTY_PROFILE: CustomerProfile = {
  id: "",
  fullName: "No customer selected",
  phone: "No phone on file",
  email: "No email on file",
  address: "",
};
