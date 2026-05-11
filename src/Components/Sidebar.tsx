import Link from "next/link";
import { MdDashboard, MdInventory, MdPeople, MdPointOfSale, MdCalendarToday, MdBarChart, MdSettings, MdHelp, MdLogout } from "react-icons/md";
import { FaUserFriends } from "react-icons/fa";

function Sidebar() {
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
                <Link href="/dashboard" className="sidebar-item">
                    <MdDashboard size={16} /> Dashboard
                </Link>
                <Link href="/inventory" className="sidebar-item">
                    <MdInventory size={16} /> Inventory
                </Link>
                <Link href="/staff" className="sidebar-item">
                    <MdPeople size={16} /> Staff Management
                </Link>
                <Link href="/pos" className="sidebar-item">
                    <MdPointOfSale size={16} /> Sales & POS
                </Link>
                <Link href="/customers" className="sidebar-item">
                    <FaUserFriends size={16} /> Customer List
                </Link>
                <Link href="/appointments" className="sidebar-item active">
                    <MdCalendarToday size={16} /> Appointment Booking
                </Link>
                <Link href="/reporting" className="sidebar-item">
                    <MdBarChart size={16} /> Reporting
                </Link>
                <Link href="/settings" className="sidebar-item">
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