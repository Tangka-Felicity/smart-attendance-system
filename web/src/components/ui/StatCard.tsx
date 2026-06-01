import React, { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type StatStatus = 'good' | 'warning' | 'critical' | 'primary' | 'neutral';

interface StatCardProps {
  value: string | number;
  label: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  trendLabel?: string;
  status?: StatStatus;
  accent?: string;
  icon?: React.ReactNode;
  className?: string;
}

const accentByStatus: Record<StatStatus, string> = {
  good: '#16A34A',
  warning: '#D97706',
  critical: '#DC2626',
  primary: '#1A56DB',
  neutral: '#1A56DB',
};

const tintByStatus: Record<StatStatus, string> = {
  good: 'var(--success-bg)',
  warning: 'var(--warning-bg)',
  critical: 'var(--danger-bg)',
  primary: 'var(--primary-light)',
  neutral: 'var(--primary-light)',
};

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  trend,
  trendLabel = 'from last month',
  status = 'neutral',
  accent,
  icon,
  className = '',
}) => {
  const [hover, setHover] = useState(false);
  const color = accent || accentByStatus[status];
  const tint = tintByStatus[status];

  return (
    <div
      className={`ui-card ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: 24,
        boxShadow: hover ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: hover ? 'translateY(-2px)' : 'none',
        transition: 'var(--transition)',
      }}
    >
      {/* decorative blur circle */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: color,
          opacity: 0.08,
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
          }}
        >
          {label}
        </p>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: tint,
              color,
              fontSize: 18,
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--text)', marginTop: 12, lineHeight: 1.1 }}>
        {value}
      </div>

      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13 }}>
          {trend.isPositive ? (
            <TrendingUp size={16} style={{ color: 'var(--success)' }} />
          ) : (
            <TrendingDown size={16} style={{ color: 'var(--danger)' }} />
          )}
          <span style={{ color: trend.isPositive ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
            {trend.value}%
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{trendLabel}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;
