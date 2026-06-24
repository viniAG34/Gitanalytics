import React from 'react';

interface PropsDoPageWrapper {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className = '' }: PropsDoPageWrapper) {
  return (
    <main className={`mx-auto max-w-7xl px-4 py-8 ${className}`}>
      {children}
    </main>
  );
}
