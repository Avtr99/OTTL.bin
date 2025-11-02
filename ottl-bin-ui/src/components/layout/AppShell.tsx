import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
}

/**
 * AppShell - Main application layout wrapper
 * Applies the global background treatment and typography defaults
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#100f18] via-[#171823] to-[#0f1018] text-text-primary">
      <div className="min-h-screen bg-background-soft/70 backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}
