import React from 'react';

interface PropsDoCard {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: PropsDoCard) {
  return (
    <div className={`rounded-xl border border-gray-800 bg-gray-900 p-4 ${className}`}>
      {children}
    </div>
  );
}
