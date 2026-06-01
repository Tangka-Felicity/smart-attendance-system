import React from 'react';

type BadgeVariant = 'good' | 'warning' | 'atRisk' | 'critical' | 'primary' | 'purple' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantClass: Record<BadgeVariant, string> = {
  good: 'badge-good',
  warning: 'badge-warning',
  atRisk: 'badge-atRisk',
  critical: 'badge-critical',
  primary: 'badge-primary',
  purple: 'badge-purple',
  neutral: 'badge-neutral',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  dot = false,
  className = '',
}) => {
  return (
    <span className={`badge ${variantClass[variant]} ${className}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
};

export default Badge;
