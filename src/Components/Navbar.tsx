import Link from "next/link";

function Navbar() {
    return (
        <nav className="navbar">
            {/* Logo */}
            <Link href="/" className="navbar-logo">
                PartTrack
            </Link>

            {/* Nav Links */}
            <div className="navbar-links">
                <Link href="/inventory" className="navbar-link">Inventory</Link>
                <Link href="/orders" className="navbar-link active">Orders</Link>
                <Link href="/support" className="navbar-link">Support</Link>
            </div>

            {/* Search Bar */}
            <div className="navbar-search">
                <svg width="15" height="15" fill="none" stroke="currentColor"
                     strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    type="text"
                    placeholder="Quick Search Parts..."
                    className="navbar-search-input"
                />
            </div>

            {/* Right Side Icons */}
            <div className="navbar-icons">
                <button aria-label="Notifications" className="icon-btn">
                    <svg width="17" height="17" fill="none" stroke="currentColor"
                         strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                </button>
                <button aria-label="User account" className="icon-btn">
                    <svg width="17" height="17" fill="none" stroke="currentColor"
                         strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                </button>
            </div>
        </nav>
    );
}

export default Navbar;