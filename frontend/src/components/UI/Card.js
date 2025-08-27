import React from 'react';
import { clsx } from 'clsx';

const Card = ({ 
  children, 
  className = '', 
  variant = 'default',
  hover = true,
  glass = false,
  ...props 
}) => {
  const baseClasses = 'rounded-2xl transition-all duration-300';
  
  const variants = {
    default: 'bg-slate-800/30 backdrop-blur-md border border-slate-700/50 shadow-xl',
    elevated: 'bg-slate-800/50 backdrop-blur-md border border-slate-600/50 shadow-2xl',
    outline: 'bg-transparent border-2 border-slate-600/50',
    glass: 'bg-white/10 backdrop-blur-md border border-white/20 shadow-xl'
  };
  
  const hoverClasses = hover ? 'hover:shadow-2xl hover:border-slate-600/50' : '';
  const glassClasses = glass ? 'bg-white/10 backdrop-blur-md border border-white/20 shadow-xl' : '';

  return (
    <div
      className={clsx(
        baseClasses,
        glass ? glassClasses : variants[variant],
        hoverClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ children, className = '', ...props }) => (
  <div className={clsx('px-6 py-4 border-b border-slate-700/50', className)} {...props}>
    {children}
  </div>
);

const CardBody = ({ children, className = '', ...props }) => (
  <div className={clsx('px-6 py-4', className)} {...props}>
    {children}
  </div>
);

const CardFooter = ({ children, className = '', ...props }) => (
  <div className={clsx('px-6 py-4 border-t border-slate-700/50 bg-slate-800/20', className)} {...props}>
    {children}
  </div>
);

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
