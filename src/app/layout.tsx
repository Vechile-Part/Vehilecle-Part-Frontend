import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppHeader from "./AppHeader";
import Footer from "../Components/Footer";
import Sidebar from "../Components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
    title: "Vehicle Parts Portal",
    description: "Frontend for features 1, 2, 3, 12, 13, 14",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="en">
        <body>
        <div className="layout-body">
            <Sidebar />
            <div className="layout-content">
                <AppHeader />
                <main className="layout-main">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
        </body>
        </html>
    );
}
