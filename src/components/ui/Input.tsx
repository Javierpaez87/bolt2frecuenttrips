import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, fullWidth = true, leftIcon, rightIcon, className, ...props }, ref) => {
    return (
      <div className={clsx('mb-4', fullWidth ? 'w-full' : '')}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        
        <div className={clsx('relative')}>
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          
         <input
  ref={ref}
  className={clsx(
    'block rounded-lg border-gray-300 shadow-sm transition-colors',
    'bg-white text-stone-800 placeholder-stone-400',
    'focus:border-emerald-600 focus:ring-emerald-600',
    leftIcon ? 'pl-10' : 'pl-4',
    rightIcon ? 'pr-10' : 'pr-4',
    error ? 'border-error-500' : 'border-gray-300',
    fullWidth ? 'w-full' : '',
    'py-2',
    className
  )}
  {...props}
/>        
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        
        {error && (
          <p className="mt-1 text-sm text-error-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;