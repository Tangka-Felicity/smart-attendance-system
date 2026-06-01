import React from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  loadingRows?: number;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

export const Table = React.forwardRef<HTMLDivElement, TableProps<any>>(
  (
    {
      columns,
      data,
      isLoading = false,
      loadingRows = 5,
      emptyState,
      onRowClick,
      className = '',
    },
    ref
  ) => {
    const cellStyle: React.CSSProperties = {
      padding: '0 20px',
      height: 60,
      verticalAlign: 'middle',
      fontSize: 14,
      color: 'var(--text)',
    };

    const renderTableContent = () => {
      if (isLoading) {
        return Array.from({ length: loadingRows }).map((_, idx) => (
          <tr key={`skeleton-${idx}`} style={{ height: 60, borderBottom: '1px solid var(--border)' }}>
            {columns.map((col) => (
              <td key={`skeleton-cell-${col.key}`} style={cellStyle}>
                <div className="skeleton" style={{ height: 14, width: '70%' }} />
              </td>
            ))}
          </tr>
        ));
      }

      if (data.length === 0) {
        return (
          <tr>
            <td colSpan={columns.length} style={{ padding: 0 }}>
              {emptyState ?? (
                <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  No data available
                </p>
              )}
            </td>
          </tr>
        );
      }

      return data.map((row, rowIdx) => (
        <tr
          key={rowIdx}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          className="ui-table-row"
          style={{
            height: 60,
            borderBottom: '1px solid var(--border)',
            cursor: onRowClick ? 'pointer' : 'default',
          }}
        >
          {columns.map((col) => (
            <td key={`${rowIdx}-${col.key}`} data-label={col.label} style={cellStyle}>
              {col.render ? col.render(row[col.key as keyof typeof row], row) : row[col.key as keyof typeof row]}
            </td>
          ))}
        </tr>
      ));
    };

    return (
      <div
        ref={ref}
        className={`app-table-wrap ${className}`}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: 'left',
                    padding: '12px 20px',
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{renderTableContent()}</tbody>
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

export default Table;
