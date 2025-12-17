import { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'purple';
  className?: string;
}

export function Tag({ children, variant = 'default', className = '' }: TagProps) {
  const variantStyles = {
    default: 'bg-gray-800 text-gray-300',
    success: 'bg-green-500/10 text-green-400 border border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
