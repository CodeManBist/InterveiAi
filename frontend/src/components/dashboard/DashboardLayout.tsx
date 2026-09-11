import type { ReactNode } from "react";

import { Sidebar } from "./Sidebar";
import { MobileSidebar } from "./MobileSidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileSidebar />

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}