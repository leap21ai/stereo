import React from "react";

interface StatusTableRow {
  cells: string[];
  status: "ok" | "warn" | "err";
}

interface StatusTableProps {
  headers: string[];
  rows: StatusTableRow[];
}

const StatusTable: React.FC<StatusTableProps> = ({ headers, rows }) => {
  return (
    <table className="status-table">
      <thead>
        <tr>
          {headers.map((header, i) => (
            <th key={i}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.cells.map((cell, j) => (
              <td key={j}>
                {j === 0 && <span className={`status-dot ${row.status}`} />}
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default StatusTable;
