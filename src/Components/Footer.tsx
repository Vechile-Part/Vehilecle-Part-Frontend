"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Footer() {
    const pathname = usePathname();

    if (pathname.startsWith("/auth")) return null;

    return (
        <footer className="footer">
            <div className="footer-left">
                <span className="footer-logo">PartTrack</span>
                <span className="footer-copy">© 2026 PartTrack. All rights reserved.</span>
            </div>
            <div className="footer-links">
                <Link href="/privacy" className="footer-link">Privacy Policy</Link>
                <Link href="/terms" className="footer-link">Terms of Service</Link>
                <Link href="/api-status" className="footer-link">API Status</Link>
            </div>
        </footer>
    );
}

export default Footer;