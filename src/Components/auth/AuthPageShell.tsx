import Image from "next/image";
import type { ReactNode } from "react";

export default function AuthPageShell({ children }: { children: ReactNode }) {
    return (
        <section className="auth-page">
            <div className="auth-page-card">
                <div className="auth-page-illustration">
                    <Image src="/assets/parts.png" alt="Vehicle parts" width={360} height={220} priority />
                </div>
                {children}
            </div>
        </section>
    );
}
