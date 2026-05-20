"use client";

import { useMemo } from "react";
import { formatNpr } from "@/lib/currency";

export type ReportChartRow = {
  customerId: string;
  fullName: string;
  lifetimeSalesTotal: number;
  largestInvoiceTotal: number;
  totalOutstandingCredit: number;
};

type ReportTab = "regular" | "high" | "credit";

type CustomerReportsChartsProps = {
  regularCount: number;
  highCount: number;
  creditCount: number;
  activeTab: ReportTab;
  activeRows: ReportChartRow[];
};

const BAR = "#8a693f";

function barWidth(value: number, max: number) {
  if (value <= 0) return "0%";
  return `${Math.max(12, Math.round((value / max) * 100))}%`;
}

export default function CustomerReportsCharts({
  regularCount,
  highCount,
  creditCount,
  activeTab,
  activeRows,
}: CustomerReportsChartsProps) {
  const categories = useMemo(
    () => [
      { label: "Regular", value: regularCount },
      { label: "High spenders", value: highCount },
      { label: "Pending credit", value: creditCount },
    ],
    [regularCount, highCount, creditCount],
  );
  const categoryMax = Math.max(...categories.map((c) => c.value), 1);

  const topList = useMemo(() => {
    const sorted = [...activeRows].sort((a, b) => {
      if (activeTab === "credit") return b.totalOutstandingCredit - a.totalOutstandingCredit;
      if (activeTab === "high") return b.largestInvoiceTotal - a.largestInvoiceTotal;
      return b.lifetimeSalesTotal - a.lifetimeSalesTotal;
    });
    return sorted.slice(0, 5).map((row) => {
      const amount =
        activeTab === "credit"
          ? row.totalOutstandingCredit
          : activeTab === "high"
            ? row.largestInvoiceTotal
            : row.lifetimeSalesTotal;
      return { id: row.customerId, name: row.fullName.trim() || "Customer", amount };
    });
  }, [activeRows, activeTab]);

  const amountLabel =
    activeTab === "credit" ? "Credit due" : activeTab === "high" ? "Largest sale" : "Lifetime sales";

  return (
    <section className="staff-reports-visual" aria-label="Report summary">
      <div className="staff-reports-visual-block">
        <h2 className="staff-reports-visual-heading">Counts by category</h2>
        <ul className="staff-reports-visual-bars">
          {categories.map((item) => (
            <li key={item.label}>
              <span className="staff-reports-visual-label">{item.label}</span>
              <span className="staff-reports-visual-track" aria-hidden>
                <span
                  className="staff-reports-visual-fill"
                  style={{ width: barWidth(item.value, categoryMax), background: BAR }}
                />
              </span>
              <span className="staff-reports-visual-num">{item.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="staff-reports-visual-block">
        <h2 className="staff-reports-visual-heading">Top 5 — {amountLabel.toLowerCase()}</h2>
        {topList.length === 0 ? (
          <p className="staff-reports-visual-empty">No rows in this tab.</p>
        ) : (
          <ol className="staff-reports-visual-list">
            {topList.map((row, index) => (
              <li key={row.id}>
                <span>
                  {index + 1}. {row.name}
                </span>
                <span>{formatNpr(row.amount)}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
