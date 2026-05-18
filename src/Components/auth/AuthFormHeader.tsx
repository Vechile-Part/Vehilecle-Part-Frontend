import Image from "next/image";
import type { ReactNode } from "react";

type AuthFormHeaderProps = {
    title: string;
    children?: ReactNode;
};

export default function AuthFormHeader({ title, children }: AuthFormHeaderProps) {
    return (
        <header className="auth-page-form-head">
            <div className="auth-page-brand">
                <Image
                    src="/assets/log.png"
                    alt=""
                    width={48}
                    height={48}
                    className="auth-page-brand-logo"
                />
                <div className="auth-page-brand-copy">
                    <h2>{title}</h2>
                    {children}
                </div>
            </div>
        </header>
    );
}
