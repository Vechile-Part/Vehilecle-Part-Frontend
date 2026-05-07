"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppHeader() {
    const pathname = usePathname();
    const hideHeader = pathname === "/auth/login" || pathname === "/auth/register";

    if (hideHeader) return null;

    return (
        <header className="topbar">
            <div className="topbar-inner">
                <Link href="/" className="brand">Vehicle Parts</Link>
                <nav className="nav">
                    <Link href="/customer/profile">Customer Profile</Link>
                    <Link href="/customer/appointments">Appointments</Link>
                    <Link href="/customer/history">Purchase History</Link>
                    <Link href="/staff/customers">Staff</Link>
                    <Link href="/admin/parts">Admin</Link>
                    <Link href="/reports">Reports</Link>
                </nav>
            </div>
        </header>
    );
}
