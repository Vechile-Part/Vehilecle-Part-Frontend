"use client";

import type { FormEvent, RefObject } from "react";
import { FiSearch } from "react-icons/fi";
import type { SearchCustomer } from "../lib/types";
import { initialsFromName } from "../lib/utils";

type StaffDirectoryViewProps = {
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchInputDefault: string;
  isSearching: boolean;
  directory: SearchCustomer[];
  selectedCustomerId: string;
  detailModalOpen: boolean;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenCustomer: (customerId: string) => void;
};

export function StaffDirectoryView({
  searchInputRef,
  searchInputDefault,
  isSearching,
  directory,
  selectedCustomerId,
  detailModalOpen,
  onSearchSubmit,
  onOpenCustomer,
}: StaffDirectoryViewProps) {
  return (
    <>
      <header className="customer-directory-header">
        <div>
          <p className="customer-directory-kicker">Staff Customer Directory</p>
          <h1 className="customer-directory-title">
            View customer details, purchase history, and vehicle information.
          </h1>
        </div>

        <form className="customer-directory-search-form" onSubmit={onSearchSubmit}>
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
                onClick={() => onOpenCustomer(customer.id)}
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
                    {customer.make || customer.model
                      ? ` | ${[customer.make, customer.model].filter(Boolean).join(" ")}`
                      : ""}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </>
  );
}
