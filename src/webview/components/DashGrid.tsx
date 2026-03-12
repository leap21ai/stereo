import React from "react";

interface DashGridProps {
  cols?: number;
  children: React.ReactNode;
}

const DashGrid: React.FC<DashGridProps> = ({ cols = 3, children }) => {
  const style: React.CSSProperties = {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
  };

  return (
    <div className="dash-grid" style={style}>
      {children}
    </div>
  );
};

export default DashGrid;
