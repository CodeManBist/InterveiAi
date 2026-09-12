import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  LayoutDashboard,
  Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";

const nav = [
  {
    label: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Interviews",
    to: "/interviews",
    icon: BarChart3,
  },
  {
    label: "New Interview",
    to: "/new-interview",
    icon: Plus,
  },
] as const;

interface DashboardNavigationProps {
  onNavigate?: () => void;
}

export function DashboardNavigation({
  onNavigate,
}: DashboardNavigationProps) {
  const { pathname } = useLocation();

  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = pathname === item.to;

        return (
          <Link
            key={item.label}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors",
              active
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}