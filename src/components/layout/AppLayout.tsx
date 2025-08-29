import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
}

/**
 * Main application layout component
 * Provides consistent structure for all pages
 */
export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  sidebar,
  header
}) => {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <div className="min-h-screen w-full flex bg-background">
          {/* Toast notifications */}
          <Toaster />
          <Sonner />
          
          {/* Sidebar */}
          {sidebar}
          
          {/* Main content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            {header}
            
            {/* Page content */}
            <main className="flex-1 p-6 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </SidebarProvider>
  );
};

export default AppLayout;