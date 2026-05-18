"use client";

import { useState } from "react";

type ChartDataPoint = {
  label: string;
  grossRevenue: number;
  operatingCosts: number;
  netProfit: number;
};

interface ChartsProps {
  data: ChartDataPoint[];
}

export default function InteractiveDashboardCharts({ data }: ChartsProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="empty-chart-state" style={{ padding: "40px", textAlign: "center", color: "#6f5a45" }}>
        No data available to display charts.
      </div>
    );
  }

  // Calculate scaling factors
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.grossRevenue, d.operatingCosts, Math.abs(d.netProfit))),
    1000 // default minimum
  );

  const chartHeight = 220;
  const chartWidth = 500;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Scale Y Coordinate (up is 0 in SVG, so subtract from graphHeight)
  const getScaleY = (val: number) => {
    const ratio = Math.max(0, val) / maxVal;
    return graphHeight - ratio * graphHeight + paddingTop;
  };

  const getScaleX = (index: number) => {
    if (data.length <= 1) return paddingLeft + graphWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * graphWidth;
  };

  // Build points path for Line Chart (Revenue)
  const revenuePoints = data.map((d, i) => `${getScaleX(i)},${getScaleY(d.grossRevenue)}`).join(" ");
  const costPoints = data.map((d, i) => `${getScaleX(i)},${getScaleY(d.operatingCosts)}`).join(" ");

  // Build closed Area Path for Shaded Gradients
  const revenueAreaPoints = `${getScaleX(0)},${chartHeight - paddingBottom} ` +
    revenuePoints +
    ` ${getScaleX(data.length - 1)},${chartHeight - paddingBottom}`;

  // Y Axis ticks
  const ticks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  const formatCurrencyLabel = (val: number) => {
    if (val >= 100000) return `Rs ${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `Rs ${(val / 1000).toFixed(0)}k`;
    return `Rs ${val}`;
  };

  return (
    <div className="dashboard-interactive-charts-grid" style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
      gap: "24px",
      margin: "24px 0"
    }}>
      {/* 1. Line/Area Chart: Revenue Trends */}
      <div className="chart-wrapper-card" style={{
        background: "#ffffff",
        border: "1px solid #eadfcd",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 4px 20px rgba(61, 40, 23, 0.05)",
        position: "relative"
      }}>
        <h3 style={{ margin: "0 0 6px 0", color: "#3d2817", fontSize: "16px", fontWeight: "700" }}>Revenue & Profit Trends</h3>
        <p style={{ margin: "0 0 20px 0", color: "#6f5a45", fontSize: "13px" }}>Interactive visual overview of financial health.</p>

        <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight} style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#83512E" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#83512E" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines & Y Ticks */}
            {ticks.map((tick, i) => {
              const y = getScaleY(tick);
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#eadfcd"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="#8a7358"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {formatCurrencyLabel(tick)}
                  </text>
                </g>
              );
            })}

            {/* X Labels */}
            {data.map((d, i) => {
              const x = getScaleX(i);
              return (
                <text
                  key={i}
                  x={x}
                  y={chartHeight - paddingBottom + 20}
                  textAnchor="middle"
                  fill="#8a7358"
                  fontSize="11"
                  fontWeight="600"
                >
                  {d.label}
                </text>
              );
            })}

            {/* Area under line */}
            <polygon points={revenueAreaPoints} fill="url(#revGrad)" />

            {/* Revenue Line */}
            <polyline
              fill="none"
              stroke="#83512E"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={revenuePoints}
            />

            {/* Cost Line */}
            <polyline
              fill="none"
              stroke="#d97706"
              strokeWidth="2.5"
              strokeDasharray="3,3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={costPoints}
            />

            {/* Interactive Circles & Hover Overlay */}
            {data.map((d, i) => {
              const x = getScaleX(i);
              const yRev = getScaleY(d.grossRevenue);
              const yCost = getScaleY(d.operatingCosts);

              return (
                <g key={i}>
                  {/* Invisible tall hover zone */}
                  <rect
                    x={x - 15}
                    y={paddingTop}
                    width="30"
                    height={graphHeight}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />

                  {/* Active highlight bar */}
                  {hoverIndex === i && (
                    <line
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={chartHeight - paddingBottom}
                      stroke="#83512E"
                      strokeWidth="1.5"
                      strokeDasharray="2,2"
                    />
                  )}

                  {/* Data Points */}
                  <circle
                    cx={x}
                    cy={yRev}
                    r={hoverIndex === i ? 6 : 4}
                    fill="#83512E"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <circle
                    cx={x}
                    cy={yCost}
                    r={hoverIndex === i ? 5 : 3.5}
                    fill="#d97706"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "10px", fontSize: "12px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#3d2817", fontWeight: "600" }}>
            <span style={{ display: "inline-block", width: "12px", height: "4px", background: "#83512E", borderRadius: "2px" }} />
            Gross Revenue
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6f5a45", fontWeight: "600" }}>
            <span style={{ display: "inline-block", width: "12px", height: "4px", background: "#d97706", borderRadius: "2px" }} />
            Expenses
          </span>
        </div>

        {/* Tooltip display */}
        {hoverIndex !== null && data[hoverIndex] && (
          <div style={{
            position: "absolute",
            top: "70px",
            right: "20px",
            background: "rgba(61, 40, 23, 0.95)",
            border: "1px solid #eadfcd",
            borderRadius: "10px",
            padding: "10px 14px",
            color: "#ffffff",
            fontSize: "12px",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            zIndex: 10,
            pointerEvents: "none"
          }}>
            <div style={{ fontWeight: "700", marginBottom: "4px", color: "#eadfcd" }}>{data[hoverIndex].label}</div>
            <div style={{ margin: "2px 0" }}>Sales: <strong style={{ color: "#4ade80" }}>Rs {data[hoverIndex].grossRevenue.toLocaleString()}</strong></div>
            <div style={{ margin: "2px 0" }}>Costs: <strong style={{ color: "#f87171" }}>Rs {data[hoverIndex].operatingCosts.toLocaleString()}</strong></div>
            <div style={{ margin: "2px 0", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "4px" }}>
              Net Profit: <strong>Rs {data[hoverIndex].netProfit.toLocaleString()}</strong>
            </div>
          </div>
        )}
      </div>

      {/* 2. Side-By-Side Comparison Column Chart */}
      <div className="chart-wrapper-card" style={{
        background: "#ffffff",
        border: "1px solid #eadfcd",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 4px 20px rgba(61, 40, 23, 0.05)"
      }}>
        <h3 style={{ margin: "0 0 6px 0", color: "#3d2817", fontSize: "16px", fontWeight: "700" }}>Monthly Performance</h3>
        <p style={{ margin: "0 0 20px 0", color: "#6f5a45", fontSize: "13px" }}>Monthly comparisons of gross revenue vs operations.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {data.slice(-4).map((d, i) => {
            const sum = d.grossRevenue + d.operatingCosts || 1;
            const revPct = Math.round((d.grossRevenue / sum) * 100);
            const costPct = Math.round((d.operatingCosts / sum) * 100);

            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700", color: "#3d2817" }}>
                  <span>{d.label}</span>
                  <span style={{ color: d.netProfit >= 0 ? "#15803d" : "#b91c1c" }}>
                    Net: Rs {d.netProfit.toLocaleString()}
                  </span>
                </div>
                <div style={{
                  height: "22px",
                  display: "flex",
                  borderRadius: "8px",
                  overflow: "hidden",
                  background: "#f3f4f6"
                }}>
                  {d.grossRevenue > 0 && (
                    <div style={{
                      width: `${revPct}%`,
                      background: "#83512E",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "width 0.3s ease"
                    }} title={`Sales Rs ${d.grossRevenue}`}>
                      {revPct > 15 ? `${revPct}%` : ""}
                    </div>
                  )}
                  {d.operatingCosts > 0 && (
                    <div style={{
                      width: `${costPct}%`,
                      background: "#d97706",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "width 0.3s ease"
                    }} title={`Expenses Rs ${d.operatingCosts}`}>
                      {costPct > 15 ? `${costPct}%` : ""}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
