import React from 'react';
import { clsx } from 'clsx';

const Badge = ({ 
  children, 
  variant = 'default',
  size = 'md',
  className = '',
  icon: Icon,
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full shadow-lg backdrop-blur-sm';
  
  const variants = {
    default: 'bg-slate-700/50 text-slate-200 border border-slate-600/50',
    primary: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-500/30',
    success: 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-300 border border-emerald-500/30',
    warning: 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/30',
    error: 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-300 border border-red-500/30',
    info: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-300 border border-blue-500/30',
    purple: 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-300 border border-purple-500/30',
    outline: 'bg-transparent border-2 border-slate-600 text-slate-300'
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm'
  };

  return (
    <span
      className={clsx(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {Icon && <Icon className="mr-1 h-3 w-3" />}
      {children}
    </span>
  );
};

export default Badge;
