import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br from-gray-900 to-gray-900/50 border border-gray-800 rounded-2xl shadow-xl ${
        onClick ? 'cursor-pointer hover:border-gray-700 transition-all hover:shadow-2xl' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
