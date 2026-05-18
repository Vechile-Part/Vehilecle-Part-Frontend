import type { Metadata } from "next";
import type { ReactNode } from "react";
import AuthSessionSync from "../Components/AuthSessionSync";
import ConditionalAppChrome from "../Components/ConditionalAppChrome";
import { AuthProvider } from "@/Components/auth/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
    title: "Vehicle Parts Portal",
    description: "Frontend for features 1, 2, 3, 12, 13, 14",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="en">
        <body suppressHydrationWarning>
            <AuthProvider>
                <AuthSessionSync />
                <ConditionalAppChrome>{children}</ConditionalAppChrome>
            </AuthProvider>
        </body>
        </html>
    );
}
