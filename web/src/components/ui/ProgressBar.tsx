import React from 'react';

interface ProgressBarProps {
  percentage: number;
  label?: string;
  showLabel?: boolean;
  height?: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  label,
  showLabel = true,
  height = 8,
  className = '',
}) => {
  const clamped = Math.max(0, Math.min(100, percentage));

  let color = 'var(--danger)';
  if (clamped >= 80) color = 'var(--success)';
  else if (clamped >= 60) color = 'var(--warning)';
  else if (clamped >= 40) color = 'var(--at-risk)';

  return (
    <div className={className}>
      {(label || showLabel) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          {label && <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>}
          {showLabel && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{clamped}%</span>}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height,
          background: 'var(--bg-hover)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            background: color,
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
