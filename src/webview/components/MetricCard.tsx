import React from "react";

interface MetricCardProps {
  label: string;
  value: string;
  status?: "success" | "danger" | "caution" | "neutral";
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  status = "neutral",
  subtitle,
}) => {
  const valueClass = status !== "neutral" ? ` ${status}` : "";

  return (
    <div className="dash-card">
      <div className="dash-card-label">{label}</div>
      <div className={`dash-card-value${valueClass}`}>{value}</div>
      {subtitle && <div className="dash-card-sub">{subtitle}</div>}
    </div>
  );
};

export default MetricCard;
