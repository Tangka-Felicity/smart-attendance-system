import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '60px 20px',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          fontSize: 30,
        }}
      >
        {icon ?? '📭'}
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginTop: 16 }}>{title}</h3>
      {description && (
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8, maxWidth: 360 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
