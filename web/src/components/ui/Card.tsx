import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  shadow?: boolean;
  style?: React.CSSProperties;
}

interface CardHeaderProps {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  shadow = false,
  style,
}) => {
  return (
    <div
      className={`ui-card ${className}`}
      style={{ boxShadow: shadow ? 'var(--shadow-md)' : 'var(--shadow-sm)', ...style }}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-between ${className}`}
      style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}
    >
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
};

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = '',
  style,
}) => {
  return (
    <div className={className} style={{ padding: 24, ...style }}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`flex gap-3 justify-end ${className}`}
      style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}
    >
      {children}
    </div>
  );
};

export default Card;
