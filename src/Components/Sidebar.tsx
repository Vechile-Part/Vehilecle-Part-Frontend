"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdDashboard, MdInventory, MdPeople, MdPointOfSale, MdCalendarToday, MdBarChart, MdSettings, MdHelp, MdLogout } from "react-icons/md";
import { FaUserFriends } from "react-icons/fa";

function Sidebar() {
    const pathname = usePathname();
    const isActive = (paths: string[]) =>
        paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

    return (
        <aside className="sidebar">
            {/* Warehouse Badge */}
            <div className="sidebar-badge">
                <div className="sidebar-badge-icon">
                    <svg width="16" height="16" fill="none" stroke="currentColor"
                         strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                </div>
                <div>
                    <p className="sidebar-badge-name">Main Warehouse</p>
                    <p className="sidebar-badge-sub">Terminal ID: 082</p>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="sidebar-nav">
                <Link href="/dashboard" className={`sidebar-item ${isActive(["/dashboard"]) ? "active" : ""}`}>
                    <MdDashboard size={16} /> Dashboard
                </Link>
                <Link href="/inventory" className={`sidebar-item ${isActive(["/inventory"]) ? "active" : ""}`}>
                    <MdInventory size={16} /> Inventory
                </Link>
                <Link href="/staff" className={`sidebar-item ${isActive(["/staff", "/admin/staff"]) ? "active" : ""}`}>
                    <MdPeople size={16} /> Staff Management
                </Link>
                <Link href="/pos" className={`sidebar-item ${isActive(["/pos", "/admin/purchase-invoices"]) ? "active" : ""}`}>
                    <MdPointOfSale size={16} /> Sales & POS
                </Link>
                <Link href="/customers" className={`sidebar-item ${isActive(["/customers", "/staff/customers"]) ? "active" : ""}`}>
                    <FaUserFriends size={16} /> Customer List
                </Link>
                <Link href="/appointments" className={`sidebar-item ${isActive(["/appointments", "/customer/appointments"]) ? "active" : ""}`}>
                    <MdCalendarToday size={16} /> Appointment Booking
                </Link>
                <Link href="/reporting" className={`sidebar-item ${isActive(["/reporting", "/reports"]) ? "active" : ""}`}>
                    <MdBarChart size={16} /> Reporting
                </Link>
                <Link href="/settings" className={`sidebar-item ${isActive(["/settings"]) ? "active" : ""}`}>
                    <MdSettings size={16} /> System Settings
                </Link>
            </nav>

            {/* Bottom */}
            <div className="sidebar-bottom">
                <button className="sidebar-new-sale">+ New Sale</button>
                <Link href="/help" className="sidebar-item">
                    <MdHelp size={16} /> Help Center
                </Link>
                <Link href="/logout" className="sidebar-item sidebar-logout">
                    <MdLogout size={16} /> Logout
                </Link>
            </div>
        </aside>
    );
}

export default Sidebar;
