import React from 'react';

interface SkeletonCardProps {
  count?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ count = 3 }) => {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="ui-card"
          style={{ padding: 24 }}
        >
          <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 16 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton" style={{ height: 14, width: '100%' }} />
            <div className="skeleton" style={{ height: 14, width: '85%' }} />
            <div className="skeleton" style={{ height: 12, width: '65%' }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonCard;
