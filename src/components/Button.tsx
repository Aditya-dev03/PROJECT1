import React from 'react';
import { WebIcon } from './WebIcon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  icon?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  icon,
  className = '',
  style,
  disabled,
  ...props
}) => {
  let btnClass = 'btn-primary';
  if (variant === 'secondary') btnClass = 'btn-secondary';
  if (variant === 'outline') btnClass = 'btn-outline';

  return (
    <button
      className={`${btnClass} ${className}`}
      disabled={disabled || loading}
      style={{
        width: '100%',
        height: '52px',
        fontSize: '1rem',
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '18px',
              height: '18px',
              border: '2.5px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#FFFFFF',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>Loading...</span>
        </div>
      ) : (
        <>
          {icon && <WebIcon name={icon} size={18} />}
          <span>{title}</span>
        </>
      )}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
};
