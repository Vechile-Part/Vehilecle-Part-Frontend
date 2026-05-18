"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  MdBarChart,
  MdCalendarToday,
  MdHelp,
  MdInventory,
  MdLogout,
  MdNotifications,
  MdNotificationsNone,
  MdPeople,
  MdPersonOutline,
  MdPointOfSale,
  MdRateReview,
  MdReceiptLong,
  MdSearch,
  MdHistory,
  MdAssignment,
} from "react-icons/md";
import { FaUserFriends } from "react-icons/fa";
import AdminNotificationBell from "./AdminNotificationBell";
import { useAuth } from "@/Components/auth/AuthContext";

type ShellRole = "admin" | "staff" | "customer";

type NavItem = {
  href: string;
  label: string;
  match: string[];
  roles: ShellRole[];
  Icon: React.ComponentType<{ size?: number }>;
};

function roleHomeHref(role: ShellRole | null): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "staff":
      return "/staff/customers";
    case "customer":
      return "/customer/profile";
    default:
      return "/auth/login";
  }
}

const MAIN_NAV: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    match: ["/admin/dashboard"],
    roles: ["admin"],
    Icon: MdBarChart,
  },
  {
    href: "/admin/parts",
    label: "Parts & inventory",
    match: ["/admin/parts"],
    roles: ["admin"],
    Icon: MdInventory,
  },
  {
    href: "/admin/staff",
    label: "Staff management",
    match: ["/admin/staff"],
    roles: ["admin"],
    Icon: MdPeople,
  },
  {
    href: "/admin/customer-accounts",
    label: "Customers",
    match: ["/admin/customer-accounts", "/customers"],
    roles: ["admin"],
    Icon: FaUserFriends,
  },
  {
    href: "/admin/purchase-invoices",
    label: "Purchase invoices",
    match: ["/admin/purchase-invoices"],
    roles: ["admin"],
    Icon: MdReceiptLong,
  },
  {
    href: "/admin/vendors",
    label: "Vendors",
    match: ["/admin/vendors"],
    roles: ["admin"],
    Icon: MdPeople,
  },
  { href: "/pos", label: "Sales & POS", match: ["/pos"], roles: ["admin", "staff"], Icon: MdPointOfSale },
  {
    href: "/staff/invoices",
    label: "Sales invoices",
    match: ["/staff/invoices"],
    roles: ["admin", "staff"],
    Icon: MdReceiptLong,
  },
  {
    href: "/staff/customers",
    label: "Customers",
    match: ["/staff/customers"],
    roles: ["staff"],
    Icon: FaUserFriends,
  },
  {
    href: "/staff/reports",
    label: "Customer reports",
    match: ["/staff/reports"],
    roles: ["staff"],
    Icon: MdBarChart,
  },
  {
    href: "/staff/register",
    label: "Register customer",
    match: ["/staff/register"],
    roles: ["staff"],
    Icon: MdAssignment,
  },
  {
    href: "/reporting",
    label: "Financial reporting",
    match: ["/reporting", "/reports"],
    roles: ["admin"],
    Icon: MdBarChart,
  },
  {
    href: "/admin/alerts",
    label: "Stock & credit alerts",
    match: ["/admin/alerts"],
    roles: ["admin"],
    Icon: MdNotifications,
  },
  {
    href: "/admin/part-requests",
    label: "Part requests",
    match: ["/admin/part-requests"],
    roles: ["admin"],
    Icon: MdAssignment,
  },
  {
    href: "/customer/profile",
    label: "My profile",
    match: ["/customer/profile"],
    roles: ["customer"],
    Icon: MdPersonOutline,
  },
  {
    href: "/customer/appointments",
    label: "Appointments",
    match: ["/customer/appointments"],
    roles: ["customer"],
    Icon: MdCalendarToday,
  },
  {
    href: "/customer/history",
    label: "Service history",
    match: ["/customer/history"],
    roles: ["customer"],
    Icon: MdHistory,
  },
  {
    href: "/customer/part-requests",
    label: "Part requests",
    match: ["/customer/part-requests"],
    roles: ["customer"],
    Icon: MdAssignment,
  },
  {
    href: "/customer/reviews",
    label: "Reviews",
    match: ["/customer/reviews"],
    roles: ["customer"],
    Icon: MdRateReview,
  },
];

function pathMatches(pathname: string, segments: string[]): boolean {
  return segments.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function Sidebar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [quickSearch, setQuickSearch] = useState("");
  const { user } = useAuth();

  const authed = Boolean(user);
  const shellRole = user ? user.role : null;

  const visibleNav = useMemo(() => {
    if (!shellRole) return [];
    return MAIN_NAV.filter((item) => item.roles.includes(shellRole));
  }, [shellRole]);

  const accountHref = shellRole === "customer" ? "/customer/profile" : "/settings";

  const badge = useMemo(() => {
    if (shellRole === "customer") {
      return { title: "Customer portal", sub: "Book services & manage your account" };
    }
    if (shellRole === "staff") {
      return { title: "Staff workspace", sub: "Signed in as staff" };
    }
    if (shellRole === "admin") {
      return { title: "Admin workspace", sub: "Inventory & billing" };
    }
    return { title: "PartTrack", sub: "Signed in" };
  }, [shellRole]);

  if (!authed) return null;

  const submitQuickSearch = () => {
    const query = quickSearch.trim();
    if (!query) return;
    const params = new URLSearchParams({ q: query });
    if (shellRole === "admin") {
      router.push(`/admin/parts?${params.toString()}`);
      return;
    }
    if (shellRole === "staff") {
      router.push(`/pos?${params.toString()}`);
    }
  };

  return (
    <aside className="sidebar customer-portal-sidebar">
      <Link href={roleHomeHref(shellRole)} className="sidebar-product-brand">
        <Image
          src="/assets/log.png"
          alt=""
          width={36}
          height={36}
          className="sidebar-product-brand-logo"
        />
        <span className="sidebar-product-brand-text">PartTrack</span>
      </Link>

      <div className="sidebar-badge">
        <div className="sidebar-badge-icon">
          <svg
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <div>
          <p className="sidebar-badge-name">{badge.title}</p>
          <p className="sidebar-badge-sub">{badge.sub}</p>
        </div>
      </div>

      {shellRole !== "customer" && (
        <div className="sidebar-search-block">
          <label className="sidebar-search-label" htmlFor="sidebar-quick-search">
            Quick search
          </label>
          <form
            className="sidebar-search"
            onSubmit={(event) => {
              event.preventDefault();
              submitQuickSearch();
            }}
          >
            <MdSearch size={18} aria-hidden className="sidebar-search-icon" />
            <input
              id="sidebar-quick-search"
              type="search"
              placeholder="Search parts…"
              className="sidebar-search-input"
              autoComplete="off"
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
            />
          </form>
        </div>
      )}

      <div className="sidebar-toolbar" aria-label="Account shortcuts">
        {shellRole === "admin" ? (
          <AdminNotificationBell />
        ) : (
          <button type="button" className="sidebar-icon-btn" aria-label="Notifications">
            <MdNotificationsNone size={20} />
          </button>
        )}
        <Link href={accountHref} className="sidebar-icon-btn" aria-label="Account">
          <MdPersonOutline size={20} />
        </Link>
      </div>

      <p className="sidebar-nav-heading">{shellRole === "customer" ? "Your menu" : "Menu"}</p>
      <nav className="sidebar-nav" aria-label="Main">
        {shellRole === null && (
          <p className="sidebar-role-unknown">Could not read your role from the session. Try signing in again.</p>
        )}
        {visibleNav.map(({ href, label, match, Icon }) => (
          <Link
            key={href + label}
            href={href}
            className={`sidebar-item ${pathMatches(pathname, match) ? "active" : ""}`}
          >
            <Icon size={18} /> {label}
          </Link>
        ))}
        {shellRole !== null && visibleNav.length === 0 && (
          <p className="sidebar-role-unknown">No navigation items for this account.</p>
        )}
      </nav>

      <div className="sidebar-bottom">
        {shellRole !== "customer" && (
          <Link href="/pos" className="sidebar-new-sale">
            <MdPointOfSale size={18} aria-hidden />
            New Sale
          </Link>
        )}
        <Link href="/help" className="sidebar-item">
          <MdHelp size={18} /> Help Center
        </Link>
        <Link href="/logout" className="sidebar-item sidebar-logout">
          <MdLogout size={18} /> Logout
        </Link>
      </div>
    </aside>
  );
}

export default Sidebar;
