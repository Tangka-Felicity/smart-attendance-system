import React from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  required,
  className = '',
  ...props
}) => {
  return (
    <div style={{ width: '100%' }}>
      {label && (
        <label className="field-label">
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {leftIcon && (
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            {leftIcon}
          </div>
        )}
        <input
          className={`field-input ${error ? 'has-error' : ''} ${className}`}
          style={{ paddingLeft: leftIcon ? 40 : undefined }}
          {...props}
        />
      </div>
      {error && (
        <p className="field-error">
          <AlertCircle size={14} />
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
