import React from "react";

interface SparklineProps {
  label: string;
  data: number[];
  thresholds?: { warn: number; err: number };
}

const Sparkline: React.FC<SparklineProps> = ({
  label,
  data,
  thresholds = { warn: 70, err: 90 },
}) => {
  const max = Math.max(...data, 1);

  const getBarStatus = (value: number): "ok" | "warn" | "err" => {
    if (value >= thresholds.err) return "err";
    if (value >= thresholds.warn) return "warn";
    return "ok";
  };

  return (
    <div className="sparkline-row">
      <div className="sparkline-label">{label}</div>
      <div className="sparkline-bars">
        {data.map((value, i) => {
          const height = Math.max((value / max) * 100, 2);
          const status = getBarStatus(value);
          return (
            <div
              key={i}
              className={`sparkline-bar ${status}`}
              style={{ height: `${height}%` }}
              title={`${value}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Sparkline;
