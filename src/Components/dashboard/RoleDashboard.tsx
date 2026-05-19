"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type DashboardKpi = {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  hrefLabel?: string;
  alert?: boolean;
};

export type DashboardAction = {
  href: string;
  label: string;
  primary?: boolean;
};

type RoleDashboardProps = {
  title: string;
  subtitle: string;
  kpis: DashboardKpi[];
  actions: DashboardAction[];
  loading?: boolean;
  error?: string;
  greeting?: ReactNode;
};

export default function RoleDashboard({
  title,
  subtitle,
  kpis,
  actions,
  loading = false,
  error = "",
  greeting,
}: RoleDashboardProps) {
  return (
    <main className="layout-main role-dashboard">
      <header className="role-dashboard-header">
        <h1 className="role-dashboard-title">{title}</h1>
        <p className="role-dashboard-subtitle">{subtitle}</p>
        {greeting}
      </header>

      {error ? (
        <p className="role-dashboard-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="role-dashboard-kpi-grid" aria-busy={loading}>
        {kpis.map((kpi) => (
          <article key={kpi.label} className="role-kpi-card">
            <p className="role-kpi-label">{kpi.label}</p>
            <p className={`role-kpi-value${kpi.alert ? " role-kpi-value--alert" : ""}`}>
              {loading ? "—" : kpi.value}
            </p>
            {!loading && kpi.hint ? <p className="role-kpi-hint">{kpi.hint}</p> : null}
            {!loading && kpi.href ? (
              <Link href={kpi.href} className="role-kpi-link">
                {kpi.hrefLabel ?? "View"}
              </Link>
            ) : null}
          </article>
        ))}
      </div>

      <div className="role-dashboard-actions">
        {actions.map((action) => (
          <Link
            key={action.href + action.label}
            href={action.href}
            className={action.primary ? "role-dashboard-btn role-dashboard-btn--primary" : "role-dashboard-btn"}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
